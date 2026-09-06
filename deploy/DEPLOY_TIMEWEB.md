# Развёртывание на Timeweb Cloud

Схема: **облачный сервер** с Docker + **управляемая БД PostgreSQL**.
Caddy на сервере сам выпускает и продлевает сертификат Let's Encrypt.

```
              ┌── https://ВАШ-ДОМЕН ──┐
   Интернет ──┤                       ├── Caddy ──┬── /api/* → backend:3001
              └───────────────────────┘           └── /*     → frontend:3000
                                                          │
                                          Управляемый PostgreSQL Timeweb (TLS)
```

Точные названия пунктов в панели Timeweb могут отличаться — ориентируйтесь по смыслу.

---

## 1. Создать управляемую БД

Панель Timeweb → «Базы данных» → создать **PostgreSQL 15** (или новее).

Из карточки БД понадобятся: **хост**, **порт**, **имя базы**, **пользователь**, **пароль**.
Если есть настройка публичного доступа — разрешите подключение с IP вашего сервера.

## 2. Создать облачный сервер

«Облачные серверы» → создать, **Ubuntu 22.04 или 24.04**.
Минимум для этого проекта — 2 ГБ RAM (сборка Next.js на 1 ГБ может не уложиться в память).

Добавьте свой SSH-ключ при создании — дальше всё делается по SSH.

## 3. Направить домен

В DNS вашего домена создайте **A-запись** на IP сервера. Проверьте:

```bash
dig +short ВАШ-ДОМЕН
```

Пока запись не разошлась, Caddy сертификат не выпустит.

## 4. Поставить Docker на сервер

```bash
ssh root@IP-СЕРВЕРА

curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 5. Залить код

GitHub сейчас недоступен, поэтому заливаем бандлом. **На своей машине:**

```bash
scp cloudco-full.bundle root@IP-СЕРВЕРА:/root/
```

**На сервере:**

```bash
git clone /root/cloudco-full.bundle /root/cloudco
cd /root/cloudco
git checkout ansdef/cloudofscience
```

Когда GitHub вернётся, дальше можно обычным `git clone` и `git pull`.

## 6. Заполнить переменные

```bash
cd /root/cloudco
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Заполните `DOMAIN`, данные БД из шага 1 и сгенерируйте секрет:

```bash
openssl rand -base64 32
```

## 7. Запустить

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build
```

Первая сборка занимает несколько минут. Логи:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env logs -f
```

## 8. Наполнить базу

Схема создаётся при первом старте бэкенда автоматически. Демо-данные и справочник
оборудования заливаются отдельно:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env \
  exec backend node dist/config/seed.js
```

> ⚠️ Сид выполняет `sync({ force: true })` — пересоздаёт таблицы и **стирает данные**.
> Запускайте только на пустой базе.

## 9. Проверить

```bash
curl https://ВАШ-ДОМЕН/api/health      # {"status":"OK",...}
curl -I https://ВАШ-ДОМЕН              # 200, сертификат валиден
```

Тестовые аккаунты после сида: `admin@cloudco.ru` / `admin123`, `user@cloudco.ru` / `user123`.
**Смените пароли или удалите этих пользователей, если сервер смотрит в интернет.**

---

## Обновление

```bash
cd /root/cloudco
git pull                 # либо снова залить бандл
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build
```

## Смена домена

`NEXT_PUBLIC_API_URL` вшивается в бандл Next.js **на этапе сборки**. После смены
`DOMAIN` в `deploy/.env` фронтенд нужно пересобрать:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build frontend
```

## Если что-то не поднялось

| Симптом | Что смотреть |
|---|---|
| Caddy не выпускает сертификат | A-запись домена; порты 80 и 443 не заняты и открыты в файрволе |
| Бэкенд падает на старте | Данные БД в `deploy/.env`; разрешён ли доступ с IP сервера; `DB_SSL=true` |
| `self signed certificate in certificate chain` | Поставьте `DB_SSL_REJECT_UNAUTHORIZED=false` |
| Фронтенд открывается, данных нет | Домен в `NEXT_PUBLIC_API_URL` — пересоберите фронтенд |
| Сборка фронтенда падает без ошибки | Не хватает памяти, нужен тариф от 2 ГБ или swap |

Логи одного сервиса:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env logs -f backend
```
