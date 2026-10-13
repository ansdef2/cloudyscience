#!/usr/bin/env bash
#
# Ежедневный бэкап сайта. Ставится в cron командой update.sh, вручную:
#   bash /root/cloudco/deploy/backup.sh
#
# Что сохраняет в /root/backups (папку можно поменять: BACKUP_DIR=...):
#   db-<дата>.sql.gz       — база, если она в контейнере (docker-compose.single.yml);
#                             управляемую базу Timeweb бэкапит провайдер
#   uploads-<дата>.tar.gz  — загруженные файлы: к броням, аватары, картинки
# Хранит базу 14 дней, файлы — 7 (KEEP_DAYS, KEEP_UPLOADS_DAYS).
#
# Восстановить базу:
#   gunzip -c /root/backups/db-<дата>.sql.gz | docker exec -i cloudco-postgres psql -U postgres cloudco

set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
KEEP_UPLOADS_DAYS="${KEEP_UPLOADS_DAYS:-7}"
STAMP="$(date +%F-%H%M)"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

env_value() {
  { grep -E "^$1=" "$APP_DIR/deploy/.env" 2>/dev/null || true; } | tail -1 | cut -d= -f2- |
    sed -E "s/^['\"]//; s/['\"]$//"
}

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ── База ────────────────────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -qx cloudco-postgres; then
  DB_USER_VALUE="$(env_value DB_USER)"
  DB_NAME_VALUE="$(env_value DB_NAME)"
  FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
  docker exec cloudco-postgres pg_dump -U "${DB_USER_VALUE:-postgres}" "${DB_NAME_VALUE:-cloudco}" | gzip >"$FILE"
  if [ "$(gzip -dc "$FILE" | head -c 1000 | wc -c)" -lt 100 ]; then
    rm -f "$FILE"
    log "ОШИБКА: дамп базы пустой — проверьте контейнер cloudco-postgres"
    exit 1
  fi
  log "база: $FILE ($(du -h "$FILE" | cut -f1))"
else
  log "база управляемая или контейнер не запущен — дамп пропущен"
fi

# ── Загруженные файлы ───────────────────────────────────────────────────────
VOLUME="$(docker inspect cloudco-backend \
  --format '{{range .Mounts}}{{if eq .Destination "/app/uploads"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
if [ -n "$VOLUME" ]; then
  FILE="uploads-$STAMP.tar.gz"
  docker run --rm -v "$VOLUME":/data:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/$FILE" -C /data .
  log "файлы: $BACKUP_DIR/$FILE ($(du -h "$BACKUP_DIR/$FILE" | cut -f1))"
else
  log "том с файлами не найден — пропускаю"
fi

# ── Старые бэкапы ───────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_UPLOADS_DAYS" -delete
log "готово, свободно на диске: $(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
