# Развёртывание на Timeweb Cloud

Есть два варианта, файлы конфигурации разные, остальные шаги одинаковые.

| | Что платите | Файл | Кому |
|---|---|---|---|
| **Один сервер** | только сервер | `docker-compose.single.yml` | дешевле; бэкапы БД на вас |
| **Сервер + управляемая БД** | сервер и БД | `docker-compose.timeweb.yml` | бэкапы и мониторинг базы делает провайдер |

База в контейнере — нормальный выбор для запуска и небольшой нагрузки.
Данные лежат в docker-томе и переживают перезапуски, но снимки надо делать
самому (см. «Бэкапы» ниже). Перейти с одного варианта на другой можно потом,
перенеся дамп.

Caddy в обоих случаях сам выпускает и продлевает сертификат Let's Encrypt.

```
              ┌── https://ВАШ-ДОМЕН ──┐
   Интернет ──┤                       ├── Caddy ──┬── /api/* → backend:3001
              └───────────────────────┘           └── /*     → frontend:3000
                                                          │
                                          Управляемый PostgreSQL Timeweb (TLS)
```

Точные названия пунктов в панели Timeweb могут отличаться — ориентируйтесь по смыслу.

---

## 1. Создать управляемую БД — только для варианта с управляемой БД

> Вариант «один сервер» этот шаг пропускает: база поднимется контейнером.
> В `deploy/.env` тогда достаточно придумать `DB_PASSWORD`, а `DB_HOST`,
> `DB_SSL` и сертификат не нужны.


Панель Timeweb → «Базы данных» → создать **PostgreSQL 15** (или новее).

Из карточки БД (вкладка «Подключение») понадобятся: **хост**, **порт**, **имя базы**,
**пользователь**, **пароль**. Пароль там скрыт звёздочками — раскройте и скопируйте.

Если есть настройка публичного доступа — разрешите подключение с IP вашего сервера.

Timeweb требует TLS-подключения и отдаёт свой корневой сертификат. Скачайте его
**на сервере** после шага 5, в каталог рядом с конфигурацией:

```bash
mkdir -p /root/cloudco/deploy/certs
curl -o /root/cloudco/deploy/certs/root.crt https://st.timeweb.com/cloud-static/ca.crt
```

Тогда в `deploy/.env` останется `DB_SSL_CA=/certs/root.crt` — сертификат сервера
будет проверяться по-настоящему. Если сертификат не скачивается, можно оставить
`DB_SSL_CA` пустым: подключение всё равно будет шифрованным, но без проверки.

## 2. Создать облачный сервер

«Облачные серверы» → создать, **Ubuntu 22.04 или 24.04**.

**2 ГБ RAM** — вариант без сюрпризов. Памяти требует только сборка фронтенда;
само приложение потом обходится куда меньшим.

**1 ГБ + swap** — дешевле, но сборка идёт дольше и без гарантии. Если берёте
такой тариф, сразу после подключения по SSH добавьте подкачку:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h            # в строке Swap должно появиться 2.0Gi
```

Если сборка всё равно падает, ограничьте кучу Node на время сборки:

```bash
NODE_OPTIONS=--max-old-space-size=768 docker compose -f deploy/docker-compose.single.yml \
  --env-file deploy/.env build frontend
```

Не помогло — поднимите тариф на время сборки и верните обратно: тарификация
почасовая, пересборка нужна редко.

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

Заполните `DOMAIN`, `PUBLIC_URL`, данные БД из шага 1 и сгенерируйте секрет:

```bash
openssl rand -base64 32
```

### Если DNS ещё не разошёлся

Caddy не выпустит сертификат, пока домен не резолвится, и всё будет выглядеть
сломанным. Чтобы не ждать — запуститесь по IP без HTTPS:

```
DOMAIN=:80
PUBLIC_URL=http://IP-СЕРВЕРА
```

Когда домен заработает, поменяйте обе строки обратно и пересоберите фронтенд:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build frontend
```

## 7. Запустить

```bash
# вариант «один сервер»
docker compose -f deploy/docker-compose.single.yml --env-file deploy/.env up -d --build

# вариант с управляемой БД
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build
```

Дальше в командах подставляйте тот файл, который выбрали.
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

Сид создаёт одного администратора — `admin@cloudyscience.ru` с паролем из
`SEED_ADMIN_PASSWORD`. В production без этой переменной сид останавливается,
чтобы в интернет не смотрела учётная запись с паролем из исходников.

---

## Бэкапы — для варианта «один сервер»

Провайдер вашу контейнерную базу не бэкапит. Снимок вручную:

```bash
docker compose -f deploy/docker-compose.single.yml --env-file deploy/.env \
  exec -T postgres pg_dump -U postgres cloudco | gzip > ~/cloudco-$(date +%F).sql.gz
```

Ежедневно в 4 утра — добавьте в `crontab -e`:

```
0 4 * * * cd /root/cloudco && docker compose -f deploy/docker-compose.single.yml --env-file deploy/.env exec -T postgres pg_dump -U postgres cloudco | gzip > /root/backup-$(date +\%F).sql.gz
```

Восстановление:

```bash
gunzip -c ~/cloudco-2026-09-20.sql.gz | docker compose -f deploy/docker-compose.single.yml \
  --env-file deploy/.env exec -T postgres psql -U postgres cloudco
```

## Обновление

Одной командой — со всем, что ниже, плюс бэкап и проверка
([`deploy/update.sh`](update.sh)):

```bash
curl -fsSL https://raw.githubusercontent.com/ansdef2/cloudyscience/main/deploy/update.sh -o /root/update.sh && bash /root/update.sh
```

Вручную:

```bash
cd /root/cloudco
git pull                 # либо снова залить бандл
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build
```

## Смена домена

`NEXT_PUBLIC_API_URL` вшивается в бандл Next.js **на этапе сборки**. После смены
`DOMAIN` и `PUBLIC_URL` в `deploy/.env` фронтенд нужно пересобрать:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env up -d --build frontend
```

## Если что-то не поднялось

| Симптом | Что смотреть |
|---|---|
| Caddy не выпускает сертификат | A-запись домена; порты 80 и 443 не заняты и открыты в файрволе |
| Бэкенд падает на старте | Данные БД в `deploy/.env`; разрешён ли доступ с IP сервера; `DB_SSL=true` |
| `DB_SSL_CA указывает на несуществующий файл` | Не скачан сертификат — см. шаг 1, либо очистите `DB_SSL_CA` |
| `self signed certificate in certificate chain` | Сертификат не подключён: задайте `DB_SSL_CA=/certs/root.crt` или `DB_SSL_REJECT_UNAUTHORIZED=false` |
| Фронтенд открывается, данных нет | `PUBLIC_URL` не совпадает с адресом в браузере — исправьте и пересоберите фронтенд |
| Ошибки CORS в консоли | `PUBLIC_URL` должен точно совпадать с адресом, по которому открыт сайт |
| Сборка фронтенда падает без ошибки | Не хватает памяти, нужен тариф от 2 ГБ или swap |

Логи одного сервиса:

```bash
docker compose -f deploy/docker-compose.timeweb.yml --env-file deploy/.env logs -f backend
```
