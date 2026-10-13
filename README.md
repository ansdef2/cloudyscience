# Облако науки

Платформа записи на курсы и бронирования оборудования образовательных
учреждений. Работает на [cloudyscience.ru](https://cloudyscience.ru).

Посетитель попадает на лендинг с описанием платформы, входит или сразу
открывает карту. На карте Большой Московской — кластеры учреждений с их
оборудованием и курсами. Дальше — парк оборудования с характеристиками и
3D-моделями, бронь станка, запись на курс. Записавшийся видит содержание
курса разбитым на этапы и отмечает пройденное — прогресс сохраняется в его
учётной записи.

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
├── server/src/iot/     # адаптеры IoT-провайдеров: OctoEverywhere, Zenoh
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

**Пользовательский контур.** Учётные записи, записи на курс, брони, отметки
о прохождении этапов, публикации в ленте. Прикрепляется к справочнику
внешними ключами `course_enrollments.courseId`, `bookings.equipmentId`,
`stage_progress.stageId`.

| Таблица | Что хранит |
|---|---|
| `users` | учётные записи, роль `user` или `admin` |
| `institutions` | учреждения: адрес, координаты для карты, часы работы, контакты |
| `courses` | курсы: направление, описание, свободные места |
| `course_modules` | модули курса: цель, результаты обучения, итог |
| `module_stages` | этапы модуля: содержание, результат, текст теории |
| `equipment` | оборудование: тип, часы работы, характеристики (JSONB) |
| `specialists` | сотрудники учреждений |
| `course_enrollments` | записи на курс, пара `userId + courseId` уникальна |
| `bookings` | брони оборудования (старые записи на курс — тоже здесь, только для чтения) |
| `stage_progress` | отметки «этап пройден», пара `userId + stageId` |
| `iot_channels` | IoT-каналы оборудования: провайдер, настройки, последнее показание |
| `data_patches` | какие разовые правки данных уже применены |
| `posts` | публикации в ленте |

## 🎓 Курс и прогресс

Содержание курса хранится в базе, а не в коде: модули и этапы с полным текстом
теории. Исходный текст первого модуля лежит в
[`server/src/config/data/module1.ts`](server/src/config/data/module1.ts) —
править его можно, не трогая код сида.

Карточка курса открыта всем, но читает токен, если он есть. Содержание модулей
видят все; прогресс — только записанные на курс: им приходят `isEnrolled: true`
и список пройденных этапов, остальным — `false` и пустой список.

Запись на курс — отдельная таблица `course_enrollments`, не бронь:

```
POST /api/courses/:id/enroll        → 201 { isEnrolled, totalSpots, availableSpots }
                                    → 409 { code: "ALREADY_ENROLLED" | "NO_SPOTS" }
```

- **мест 30** у курса «Проектное управление и информационные технологии»;
- **одна запись на человека** — проверка в транзакции плюс уникальный индекс
  `userId + courseId`, так что дубль не пройдёт даже при двух одновременных
  запросах;
- **последнее место не уходит двоим** — строка курса блокируется на время
  записи (`SELECT … FOR UPDATE`); проверено 35 параллельными записями на
  28 свободных мест: ровно 28 × `201`, 7 × `409`;
- `availableSpots` не уменьшается счётчиком, а пересчитывается из числа записей.

Снять человека с курса и вернуть место может администратор:
`DELETE /api/courses/:id/enrollments/:userId`. Записаться через
`POST /api/bookings` с `courseId` больше нельзя — сервер ответит `400`.

Отметка этапа ставится и снимается одной ручкой и требует записи на курс
(иначе `403 NOT_ENROLLED`):

```
PUT /api/progress/stages/:stageId   { "completed": true }
```

## 🗺 Карта

Главный экран приложения — `/home`. Сверху карточка с картой Большой
Московской: кластеры учреждений с числом объектов в каждом. Тап по карточке
или по кнопке в углу разворачивает карту на весь экран (анимация из карточки),
там работают жесты, а тап по кластеру открывает список оборудования и курсов
в этом здании. Escape или кнопка в углу сворачивают обратно.

- движок — [MapLibre GL JS](https://maplibre.org), грузится только на `/home`;
- тайлы — векторные [OpenFreeMap](https://openfreemap.org) (данные
  OpenStreetMap), без ключа и лимитов; свой тайл-сервер подключается
  переменными `NEXT_PUBLIC_MAP_TILES_URL` и `NEXT_PUBLIC_MAP_GLYPHS_URL`;
- стиль собран под макет в
  [`frontend/src/components/map/mapStyle.ts`](frontend/src/components/map/mapStyle.ts):
  тёмно-фиолетовый фон, полупрозрачные дома и дороги, Большая Московская
  подсвечена;
- кластеры — [supercluster](https://github.com/mapbox/supercluster) и
  HTML-маркеры в стиле карточек прототипа.

Точка учреждения — поля `latitude` / `longitude`. На работающей базе патч
данных проставляет их по адресу ориентировочно; точные координаты из
геокодера OpenStreetMap:

```bash
BASE=https://cloudyscience.ru/api python3 deploy/geocode-institutions.py          # показать
BASE=https://cloudyscience.ru/api python3 deploy/geocode-institutions.py --apply  # записать
```

Без координат учреждение на карту не попадает, остальное работает как прежде.

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

## 🔌 IoT-каналы

Резерв под телеметрию оборудования: модель, адаптеры двух провайдеров, приём
данных и блок статуса в карточке оборудования. Пока каналов нет, на сайте
ничего не меняется.

| Провайдер | Как приходят данные | Настройки канала (`config`) |
|---|---|---|
| [OctoEverywhere](https://octoeverywhere.com) | сам шлёт вебхук на `POST /api/iot/webhook/:id?token=…` | `sharedConnectionUrl` — ссылка «Открыть устройство», необязательна |
| [Zenoh](https://zenoh.io) | сервер читает REST-плагин роутера: `GET {restUrl}/{keyExpr}`; или мост сам шлёт JSON на тот же вебхук | `keyExpr` обязателен, `restUrl` — для опроса |

Подключение принтера через OctoEverywhere:

```bash
# 1. Создать канал (админ). В ответе secret — он показывается один раз
curl -X POST $BASE/iot/channels -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"provider":"octoeverywhere","name":"Принтер 1","equipmentId":"<id>","enabled":true}'

# 2. В OctoEverywhere указать вебхук: https://cloudyscience.ru/api/iot/webhook/<id>?token=<secret>
```

Для Zenoh — `{"provider":"zenoh","config":{"restUrl":"http://router:8000","keyExpr":"lab/printer-1/status"}}`;
опрос раз в `IOT_POLL_INTERVAL_SEC` секунд или вручную
`POST /api/iot/channels/:id/refresh`.

Тело события разбирается без учёта регистра: состояние — из `state`,
`status`, `eventType` или `event`; прогресс — из `progress`, `percent` или
`completion`; задание — из `fileName`, `printName` или `job`. Сырое тело
сохраняется в `lastPayload` и видно только администратору. Токен сравнивается
за постоянное время; чужой или выключенный канал отвечает `404`. Новый токен —
`PUT /api/iot/channels/:id { "rotateSecret": true }`.

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
| `IOT_POLL_INTERVAL_SEC` | backend | период опроса каналов Zenoh; не задано — без опроса |
| `NEXT_PUBLIC_API_URL` | frontend | адрес API; вшивается в бандл **на этапе сборки** |
| `NEXT_PUBLIC_MAP_TILES_URL`, `NEXT_PUBLIC_MAP_GLYPHS_URL` | frontend | свой тайл-сервер карты; не задано — OpenFreeMap |

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
| POST | `/courses/:id/enroll` | вход |
| GET | `/courses/:id/enrollments`, DELETE `/courses/:id/enrollments/:userId` | админ |
| GET | `/equipment`, `/equipment/:id` | открыто |
| GET | `/search`, `/search/popular` | открыто |
| GET | `/posts`, `/posts/:id` | открыто |
| POST | `/posts/:id/like` | открыто |
| POST, DELETE | `/posts` | вход |
| GET, POST, PUT, DELETE | `/bookings` | вход, видно только свои |
| PUT | `/progress/stages/:stageId` | вход и запись на курс |
| GET | `/iot/channels?equipmentId=` | открыто, только включённые каналы и без секретов |
| POST | `/iot/webhook/:id?token=` | токен канала |
| GET `/iot/admin/channels`; POST, PUT, DELETE | `/iot/channels`, `/iot/channels/:id/refresh` | админ |
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
`Authorization: Bearer`. С галочкой «Запомнить меня» он лежит в
`localStorage` и переживает закрытие браузера, без неё — в `sessionStorage`.
Пароль сайт не хранит: форма входа размечена для менеджеров паролей
(`autocomplete="username"` / `current-password`), а в Chrome, Edge и
Яндекс Браузере после входа через Credential Management API предлагается
сохранить пару «почта + пароль». Сайт помнит только почту. Разграничение проверяется на сервере: видимость чужих
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

Обновление на работающем сервере. Схему при старте доводит
`sequelize.sync({ alter: true })`, данные — разовые патчи из
[`server/src/config/patches.ts`](server/src/config/patches.ts): каждый
выполняется один раз и отмечается в `data_patches`. Сид для этого не нужен.

```bash
cd /root/cloudco && git pull && docker compose \
  -f deploy/docker-compose.single.yml --env-file deploy/.env up -d --build
```

Пошагово, с бэкапами и откатом: [deploy/DEPLOY_TIMEWEB.md](deploy/DEPLOY_TIMEWEB.md)

## 📚 Технологии

**Frontend** — Next.js 15, React 18, TypeScript, CSS Modules, three.js, MapLibre GL, supercluster
**Backend** — Node.js, Express, TypeScript, PostgreSQL, Sequelize, JWT, bcryptjs
**Инфраструктура** — Docker Compose, Caddy, PostgreSQL 15

## 🧭 Чего пока нет

Названо прямо, чтобы не искать это в коде:

- **веб-админки** — справочник правится через API, curl или Postman;
- **уведомлений** — ни модели, ни ручек; колокольчик в шапке открывает пустую панель;
- **журнала действий** — кто изменил запись справочника, система не фиксирует;
- **автоматических переходов статуса брони** — `pending → confirmed` переключает человек;
- **самостоятельной отписки от курса** — место освобождает администратор;
- **подключённых IoT-устройств** — каналы и приём данных готовы, но ни одного
  канала не создано, а разбор вебхука OctoEverywhere не сверен с живым событием.

## 📖 Документация

- [Docker Guide](docker-guide.md)
- [Развёртывание на сервере](deploy/DEPLOY_TIMEWEB.md)
- [Ассеты прототипа: что выгрузить из Figma](frontend/ASSETS_PROTOTYPE.md)
- [Установка backend](server/INSTALLATION.md)
- [API backend](server/README.md)
- [Интеграция фронтенда с API](frontend/BACKEND_INTEGRATION.md)
- [Маршруты фронтенда](frontend/ROUTES.md) — лендинг на `/`, приложение на `/home`
- [3D-модели: формат и раскладка](frontend/public/models/README.md)
