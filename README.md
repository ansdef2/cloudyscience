# Облако науки

Платформа записи на курсы и бронирования оборудования образовательных
учреждений. Работает на [cloudyscience.ru](https://cloudyscience.ru).

Посетитель находит учреждение на карте, смотрит парк оборудования с
характеристиками и 3D-моделями, записывается на курс или бронирует станок.
Обучающийся видит содержание курса разбитым на этапы и отмечает пройденное —
прогресс сохраняется в его учётной записи.

Монорепозиторий: Next.js-фронтенд и Express/PostgreSQL-бэкенд в одном дереве.

```
cloudyscience/
├── frontend/           # Next.js 15 (App Router), TypeScript, CSS Modules
│   └── public/
│       ├── models/     # 3D-модели оборудования (.obj / .glb)
│       └── prototype/  # ассеты дизайн-системы
├── server/             # Express + Sequelize + PostgreSQL, JWT
│   └── data/           # models.db — справочник парка оборудования (SQLite)
├── deploy/             # развёртывание на сервере и служебные скрипты
└── docker-compose.yml  # локальная разработка
```

## 🚀 Быстрый старт

### Docker

```bash
cp .env.example .env      # отредактируйте при необходимости
docker compose up -d --build
```

Залить данные — **только на пустую базу**, сид пересоздаёт таблицы:

```bash
docker compose exec -e SEED_ADMIN_PASSWORD='пароль' backend node dist/config/seed.js
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

Подробнее: [docker-guide.md](docker-guide.md)

### Локальный запуск

1. Поднимите PostgreSQL и создайте базу:

```bash
createdb cloudco
```

2. Бэкенд:

```bash
cd server
npm install
cp .env.example .env       # настройте подключение к БД
npm run db:seed            # данные
npm run dev                # http://localhost:3001
```

3. Фронтенд (во втором терминале):

```bash
cd frontend
npm install
cp env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev                # http://localhost:3000
```

## 🧩 Из чего собрана платформа

**Справочный контур.** Учреждение содержит курсы, оборудование и специалистов.
Курс разбит на модули, модуль — на этапы с текстом теории. Наполняется
администратором и сидом.

**Пользовательский контур.** Учётные записи, брони, отметки о прохождении
этапов, публикации в ленте. Прикрепляется к справочнику тремя внешними
ключами: `bookings.courseId`, `bookings.equipmentId`, `stage_progress.stageId`.

| Таблица | Что хранит |
|---|---|
| `users` | учётные записи, роль `user` или `admin` |
| `institutions` | учреждения: адрес, часы работы, контакты |
| `courses` | курсы: направление, описание, свободные места |
| `course_modules` | модули курса: цель, результаты обучения, итог |
| `module_stages` | этапы модуля: содержание, результат, текст теории |
| `equipment` | оборудование: тип, часы работы, характеристики (JSONB) |
| `specialists` | сотрудники учреждений |
| `bookings` | брони оборудования и записи на курсы |
| `stage_progress` | отметки «этап пройден», пара `userId + stageId` |
| `posts` | публикации в ленте |

## 🎓 Курс и прогресс

Содержание курса хранится в базе, а не в коде: модули и этапы с полным текстом
теории. Исходный текст первого модуля лежит в
[`server/src/config/data/module1.ts`](server/src/config/data/module1.ts) —
править его можно, не трогая код сида.

Карточка курса открыта всем, но читает токен, если он есть: гостю приходит
содержание модуля, вошедшему — то же содержание плюс список пройденных им
этапов. Отметка ставится и снимается одной ручкой:

```
PUT /api/progress/stages/:stageId   { "completed": true }
```

## 🛠 Справочник оборудования

Реальный парк лежит в `server/data/models.db` (SQLite): 8 единиц — VR-шлем,
шесть 3D-принтеров и 3D-сканер, с техническими характеристиками под каждый тип.

`npm run db:seed` импортирует его автоматически, поверх демо-позиций. Отдельно
справочник можно перезалить в любой момент:

```bash
cd server && npm run db:import-models
```

Импорт идемпотентный: повторный запуск обновляет уже загруженные позиции по
названию, а не создаёт дубликаты. Раскладка при импорте — `model_group`
попадает в поле `type`, характеристики в `characteristics` (JSONB), VR и
сканеры привязываются к Кванториуму, принтеры — к центру дополнительного
образования (в самом справочнике привязки к учреждениям нет).

## 🧊 3D-модели

Карточка оборудования переключается между фотографией и 3D-моделью.
Просмотрщик на three.js понимает `.glb`, `.gltf` и `.obj`; для OBJ рядом
ищется одноимённый `.mtl` с материалами и текстурами, без него модель
показывается нейтральным материалом. Библиотека грузится только при открытии
вкладки «3D».

Модели складываются по папке на каждую, в `frontend/public/models/`:

```
models/
  frezer/
    model.obj
    model.mtl
    texture.jpg
```

Привязка к позициям оборудования — через
[`deploy/link-3d-models.py`](deploy/link-3d-models.py). Запуск без файла
привязки печатает список позиций и найденные модели:

```bash
BASE=https://cloudyscience.ru/api python3 deploy/link-3d-models.py
```

Дальше составляется `deploy/models-map.json` вида
`{"Фрезерный станок": "/models/frezer/model.obj"}`, скрипт запускается ещё раз
и прописывает пути через API. Файлы из `public/` попадают в образ на этапе
сборки, поэтому после добавления моделей нужна пересборка контейнера.

## ⚙️ Переменные окружения

| Переменная | Где | Назначение |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | backend | подключение к PostgreSQL |
| `DB_SSL`, `DB_SSL_CA`, `DB_SSL_REJECT_UNAUTHORIZED` | backend | TLS к управляемой базе |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | backend | подпись и срок жизни токена |
| `CORS_ORIGIN` | backend | разрешённый origin; `*` — разрешить всем |
| `DB_SYNC` | backend | `false` отключает автосинхронизацию схемы при старте |
| `SEED_ON_START` | backend | `true` заливает данные при старте, **стирая базу** |
| `SEED_ADMIN_PASSWORD` | backend | пароль администратора при сиде |
| `NEXT_PUBLIC_API_URL` | frontend | адрес API; вшивается в бандл **на этапе сборки** |

`JWT_SECRET` в production обязателен: без него сервер останавливается на
старте, а не подписывает токены значением по умолчанию.

## 📡 API

Базовый префикс — `/api`. Три уровня доступа: открыто, вход, админ.

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | открыто |
| GET | `/auth/profile` | вход |
| GET | `/institutions`, `/institutions/:id`, `/institutions/:id/courses` | открыто |
| GET | `/courses` | открыто |
| GET | `/courses/:id` | открыто, читает токен при наличии |
| GET | `/equipment`, `/equipment/:id` | открыто |
| GET | `/search`, `/search/popular` | открыто |
| GET | `/posts`, `/posts/:id` | открыто |
| POST | `/posts/:id/like` | открыто |
| POST, DELETE | `/posts` | вход |
| GET, POST, PUT, DELETE | `/bookings` | вход, видно только свои |
| PUT | `/progress/stages/:stageId` | вход |
| GET, PUT, DELETE | `/users/:id` | владелец или админ |
| POST, PUT, DELETE | `/institutions`, `/courses`, `/equipment`, `/specialists` | админ |

Фильтры: `/equipment?search=&type=&status=open|closed&institutionId=`,
`/courses?search=&institutionId=`,
`/search?q=&type=address|services|equipment|specialists`,
`/posts?sort=popular|new&featured=true|false&search=`.

Ошибки различаются по коду: нарушение валидации — `400`, дубликат уникального
поля — `409`, неверный формат идентификатора — `400`. `500` остаётся за
настоящими сбоями и пишется в лог.

## 🔐 Доступ и учётные записи

Токен выдаётся при входе на семь дней и передаётся заголовком
`Authorization: Bearer`. Разграничение проверяется на сервере: видимость чужих
броней ограничивается условием в запросе к базе, а не фильтрацией ответа.

Сид создаёт одного администратора — `admin@cloudyscience.ru`. Пароль берётся
из `SEED_ADMIN_PASSWORD`; в production без этой переменной сид
останавливается, вне production используется `admin123`.

```bash
SEED_ADMIN_PASSWORD='ваш-пароль' npm run db:seed
```

Демо-авторы постов получают случайные пароли — они нужны только как подписи
под контентом. Если в базе остались учётные записи прежнего сида с известными
паролями, их обезвреживает
[`deploy/cleanup-demo-users.py`](deploy/cleanup-demo-users.py).

## 🚢 Развёртывание

Два варианта в `deploy/`: всё на одном сервере (база в контейнере) и с
управляемой базой провайдера. Caddy сам получает и продлевает сертификат
Let's Encrypt.

```bash
cp deploy/.env.example deploy/.env      # домен, пароль базы, JWT-секрет
docker compose -f deploy/docker-compose.single.yml --env-file deploy/.env up -d --build
```

Обновление на работающем сервере:

```bash
cd /root/cloudco && git pull && docker compose \
  -f deploy/docker-compose.single.yml --env-file deploy/.env up -d --build
```

Пошагово, с бэкапами и откатом: [deploy/DEPLOY_TIMEWEB.md](deploy/DEPLOY_TIMEWEB.md)

## 📚 Технологии

**Frontend** — Next.js 15, React 18, TypeScript, CSS Modules, three.js
**Backend** — Node.js, Express, TypeScript, PostgreSQL, Sequelize, JWT, bcryptjs
**Инфраструктура** — Docker Compose, Caddy, PostgreSQL 15

## 🧭 Чего пока нет

Названо прямо, чтобы не искать это в коде:

- **веб-админки** — справочник правится через API, curl или Postman;
- **уведомлений** — ни модели, ни ручек; колокольчик в шапке открывает пустую панель;
- **журнала действий** — кто изменил запись справочника, система не фиксирует;
- **автоматических переходов статуса брони** — `pending → confirmed` переключает человек.

## 📖 Документация

- [Docker Guide](docker-guide.md)
- [Развёртывание на сервере](deploy/DEPLOY_TIMEWEB.md)
- [Ассеты прототипа: что выгрузить из Figma](frontend/ASSETS_PROTOTYPE.md)
- [Установка backend](server/INSTALLATION.md)
- [API backend](server/README.md)
- [Интеграция фронтенда с API](frontend/BACKEND_INTEGRATION.md)
- [Маршруты фронтенда](frontend/ROUTES.md)
- [3D-модели: формат и раскладка](frontend/public/models/README.md)
