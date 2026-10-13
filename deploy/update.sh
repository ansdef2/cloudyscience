#!/usr/bin/env bash
#
# Обновить сайт на сервере одной командой.
#
#   curl -fsSL https://raw.githubusercontent.com/ansdef2/cloudyscience/main/deploy/update.sh -o /root/update.sh && bash /root/update.sh
#
# Что делает:
#   1. бэкап базы, если она в контейнере (docker-compose.single.yml);
#   2. код — из GitHub. Если папка сайта ещё не git-клон (заливали архивом
#      или бандлом), клонирует репозиторий рядом, переносит то, чего нет
#      в git (deploy/.env, сертификаты, 3D-модели), и меняет папки местами.
#      Старая папка остаётся как /root/cloudco-old-<дата> — для отката;
#   3. пересборка и перезапуск контейнеров;
#   4. проверка, что бэкенд поднялся, и вывод применённых патчей данных;
#   5. ежедневный бэкап базы и загруженных файлов в cron (deploy/backup.sh);
#   6. по желанию — уточнение координат учреждений (нужен пароль админа).
#
# Повторный запуск безопасен: если всё уже обновлено, он просто
# пересоберёт текущую версию.
#
# Папку сайта, compose-файл и имя проекта скрипт берёт из меток работающего
# контейнера cloudco-backend — так тома с базой и сертификатами остаются те же.
# Переопределить можно переменными APP_DIR, COMPOSE, PROJECT, BRANCH, ADMIN_EMAIL.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ansdef2/cloudyscience.git}"
BRANCH="${BRANCH:-main}"
STAMP="$(date +%F-%H%M)"

say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Значение из deploy/.env без source: в паролях бывают символы, которые bash поймёт по-своему
env_value() {
  { grep -E "^$1=" "$APP_DIR/deploy/.env" 2>/dev/null || true; } | tail -1 | cut -d= -f2- |
    sed -E "s/^['\"]//; s/['\"]$//"
}

label() {
  docker inspect cloudco-backend --format "{{ index .Config.Labels \"$1\" }}" 2>/dev/null || true
}

# ── Где и как запущен сайт ──────────────────────────────────────────────────

command -v docker >/dev/null || die "Не найден docker"
docker compose version >/dev/null 2>&1 || die "Не найден docker compose"

# working_dir — папка compose-файла, то есть <сайт>/deploy
WORKDIR="$(label com.docker.compose.project.working_dir)"
CONFIG="$(label com.docker.compose.project.config_files)"
CONFIG="${CONFIG%%,*}"

if [ -z "${APP_DIR:-}" ]; then
  case "$WORKDIR" in
    */deploy) APP_DIR="${WORKDIR%/deploy}" ;;
    '') APP_DIR=/root/cloudco ;;
    *) APP_DIR="$WORKDIR" ;;
  esac
fi
PROJECT="${PROJECT:-$(label com.docker.compose.project)}"
PROJECT="${PROJECT:-deploy}"

if [ -z "${COMPOSE:-}" ]; then
  if [ -n "$CONFIG" ]; then
    COMPOSE="deploy/$(basename "$CONFIG")"
  elif docker ps --format '{{.Names}}' | grep -qx cloudco-postgres; then
    COMPOSE=deploy/docker-compose.single.yml
  else
    COMPOSE=deploy/docker-compose.timeweb.yml
  fi
fi

[ -f "$APP_DIR/deploy/.env" ] ||
  die "Не нашёл $APP_DIR/deploy/.env. Если сайт в другой папке: APP_DIR=/путь bash $0"

if ! command -v git >/dev/null; then
  say "Ставлю git"
  apt-get update -qq && apt-get install -y -qq git >/dev/null
fi

ok "Сайт: $APP_DIR, конфигурация: $COMPOSE, проект: $PROJECT"

dc() { (cd "$APP_DIR" && docker compose -p "$PROJECT" -f "$COMPOSE" --env-file deploy/.env "$@"); }

# ── 1. Бэкап базы ───────────────────────────────────────────────────────────

if [ "$COMPOSE" = deploy/docker-compose.single.yml ]; then
  say "Бэкап базы"
  BACKUP="/root/backup-$STAMP.sql.gz"
  DB_USER_VALUE="$(env_value DB_USER)"
  DB_NAME_VALUE="$(env_value DB_NAME)"
  dc exec -T postgres pg_dump -U "${DB_USER_VALUE:-postgres}" "${DB_NAME_VALUE:-cloudco}" 2>/dev/null |
    gzip >"$BACKUP" || true

  # Пустой дамп — значит pg_dump не отработал; дальше без бэкапа не идём
  if [ "$(gzip -dc "$BACKUP" 2>/dev/null | head -c 1000 | wc -c)" -lt 100 ]; then
    rm -f "$BACKUP"
    die "Бэкап не получился — ничего не менял. Проверьте, что контейнер cloudco-postgres запущен"
  fi
  ok "Бэкап: $BACKUP ($(du -h "$BACKUP" | cut -f1))"
else
  say "База управляемая (Timeweb) — бэкап делается в панели провайдера, пропускаю"
fi

# ── 2. Код ──────────────────────────────────────────────────────────────────

if git -C "$APP_DIR" remote get-url origin 2>/dev/null | grep -q 'github.com'; then
  say "Обновляю код из GitHub"
  git -C "$APP_DIR" fetch -q origin "$BRANCH"
  git -C "$APP_DIR" checkout -q "$BRANCH" 2>/dev/null ||
    git -C "$APP_DIR" checkout -q -b "$BRANCH" "origin/$BRANCH"
  git -C "$APP_DIR" merge -q --ff-only "origin/$BRANCH" ||
    die "На сервере есть свои правки в коде, git не может обновиться поверх них. Пришлите вывод: git -C $APP_DIR status"
else
  say "Перевожу сайт на git clone (один раз)"
  NEW_DIR="$APP_DIR-new"
  OLD_DIR="$APP_DIR-old-$STAMP"

  rm -rf "$NEW_DIR"
  git clone -q --branch "$BRANCH" "$REPO_URL" "$NEW_DIR" ||
    die "Не удалось скачать код с GitHub. Возможно, GitHub недоступен с сервера"

  # Всё, чего нет в git, из deploy/ и frontend/public/: .env, сертификаты,
  # 3D-модели, models-map.json. Файлы из свежего клона не перезаписываются
  for part in deploy frontend/public; do
    [ -d "$APP_DIR/$part" ] || continue
    mkdir -p "$NEW_DIR/$part"
    (cd "$APP_DIR/$part" && tar -cf - .) | (cd "$NEW_DIR/$part" && tar --skip-old-files -xf -)
  done

  [ -f "$NEW_DIR/deploy/.env" ] || die "deploy/.env не перенёсся — остановился, старая папка не тронута"

  # Конфиги, поправленные прямо на сервере, теперь берутся из git — скажем об этом
  CHANGED="$(diff -rq "$APP_DIR/deploy" "$NEW_DIR/deploy" 2>/dev/null | grep ' differ$' | awk '{print $2}' || true)"

  mv "$APP_DIR" "$OLD_DIR"
  mv "$NEW_DIR" "$APP_DIR"
  ok "Код из GitHub, старая версия сохранена в $OLD_DIR"

  if [ -n "$CHANGED" ]; then
    printf '\033[1;33m! На сервере были свои правки, теперь эти файлы из git (старые — в %s):\033[0m\n' "$OLD_DIR"
    echo "$CHANGED" | sed "s#^$APP_DIR/#  #"
  fi
fi

ok "Версия: $(git -C "$APP_DIR" log -1 --format='%h %s')"

# ── 3. Сборка и запуск ──────────────────────────────────────────────────────

say "Собираю и перезапускаю — это займёт несколько минут"
# Старые контейнеры работают, пока собираются новые: сайт не падает на время сборки
dc up -d --build --remove-orphans

# ── 4. Проверка ─────────────────────────────────────────────────────────────

say "Жду, пока поднимется бэкенд"
for _ in $(seq 1 90); do
  dc logs backend 2>/dev/null | grep -q 'Server is running' && break
  sleep 2
done

if dc logs backend 2>/dev/null | grep -q 'Server is running'; then
  ok "Бэкенд работает"
  dc logs --no-log-prefix backend 2>/dev/null | grep 'Патч данных' || ok "Новых правок данных не было — всё уже применено раньше"
else
  printf '\n\033[1;31m✗ Бэкенд не поднялся за 3 минуты. Последние строки лога:\033[0m\n'
  dc logs --tail 40 backend || true
  [ -n "${OLD_DIR:-}" ] && printf '\nОткат: mv %s %s-broken && mv %s %s && bash %s\n' "$APP_DIR" "$APP_DIR" "$OLD_DIR" "$APP_DIR" "$0"
  exit 1
fi

# ── 5. Ежедневный бэкап ─────────────────────────────────────────────────────

CRON_FILE=/etc/cron.d/cloudco-backup
CRON_LINE="30 3 * * * root APP_DIR=$APP_DIR bash $APP_DIR/deploy/backup.sh >> /var/log/cloudco-backup.log 2>&1"
if [ -d /etc/cron.d ]; then
  if [ "$(cat "$CRON_FILE" 2>/dev/null)" != "$CRON_LINE" ]; then
    printf '%s\n' "$CRON_LINE" >"$CRON_FILE"
    chmod 644 "$CRON_FILE"
    ok "Бэкап каждую ночь в 03:30 → /root/backups (база — 14 дней, файлы — 7)"
  else
    ok "Ночной бэкап уже настроен (/root/backups)"
  fi
  command -v cron >/dev/null || command -v crond >/dev/null ||
    { apt-get install -y -qq cron >/dev/null 2>&1 && ok "Поставил cron"; } || true
else
  echo "Нет /etc/cron.d — бэкап запускайте вручную: bash $APP_DIR/deploy/backup.sh"
fi

# ── 6. Координаты учреждений (по желанию) ───────────────────────────────────

PUBLIC_URL="$(env_value PUBLIC_URL || true)"
BASE="${PUBLIC_URL:-https://cloudyscience.ru}/api"

if command -v python3 >/dev/null && [ -e /dev/tty ]; then
  say "Уточнить координаты учреждений на карте?"
  printf 'Пароль администратора (%s), Enter — пропустить: ' "${ADMIN_EMAIL:=admin@cloudyscience.ru}"
  { read -r -s ADMIN_PASSWORD </dev/tty; } 2>/dev/null || ADMIN_PASSWORD=''
  echo
  if [ -n "$ADMIN_PASSWORD" ]; then
    BASE="$BASE" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
      python3 "$APP_DIR/deploy/geocode-institutions.py" --apply ||
      echo "Не получилось — карта работает и с примерными координатами"
  fi
fi

say "Готово"
echo "Сайт: ${PUBLIC_URL:-https://cloudyscience.ru}   Карта: ${PUBLIC_URL:-https://cloudyscience.ru}/home"
[ -n "${OLD_DIR:-}" ] && echo "Если всё в порядке, старую папку можно удалить: rm -rf $OLD_DIR"
echo "Следующее обновление — та же команда, что и сейчас"
