# CloudCo — сервис бронирования оборудования и курсов

Монорепозиторий: Next.js-фронтенд и Express/PostgreSQL-бэкенд в одном дереве.

```
cloudco/
├── frontend/   # Next.js 14 (App Router), TypeScript, Tailwind
├── server/     # Express + Sequelize + PostgreSQL, JWT-авторизация
└── docker-compose.yml
```

## 🚀 Быстрый старт

### Вариант 1: Docker (рекомендуется)

```bash
cp .env.example .env      # отредактируйте при необходимости
docker-compose up -d --build
```

Залить демо-данные (только на пустую базу — seed пересоздаёт таблицы):

```bash
docker-compose exec backend node dist/config/seed.js
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

Подробнее: [docker-guide.md](docker-guide.md)

### Вариант 2: Локальный запуск

1. Поднимите PostgreSQL и создайте базу:

```bash
createdb cloudco
```

2. Бэкенд:

```bash
cd server
npm install
cp .env.example .env       # настройте подключение к БД
npm run db:seed            # демо-данные
npm run dev                # http://localhost:3001
```

3. Фронтенд (во втором терминале):

```bash
cd frontend
npm install
cp env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev                # http://localhost:3000
```

## ⚙️ Переменные окружения

| Переменная | Где | Назначение |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | backend | подключение к PostgreSQL |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | backend | подпись и срок жизни токена |
| `CORS_ORIGIN` | backend | разрешённый origin; `*` — разрешить всем |
| `DB_SYNC` | backend | `false` отключает автосинхронизацию схемы при старте |
| `SEED_ON_START` | backend | `true` заливает демо-данные при старте, **стирая базу** |
| `NEXT_PUBLIC_API_URL` | frontend | адрес API; вшивается в бандл **на этапе сборки** |

## 📡 API

Базовый префикс — `/api`.

| Метод | Путь | Доступ |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | публично |
| GET | `/auth/profile` | пользователь |
| GET | `/institutions`, `/institutions/:id`, `/institutions/:id/courses` | публично |
| GET | `/courses`, `/courses/:id` | публично |
| GET | `/equipment`, `/equipment/:id` | публично |
| GET | `/search`, `/search/popular` | публично |
| GET/POST/PUT/DELETE | `/bookings` | пользователь |
| GET/PUT/DELETE | `/users` | пользователь / админ |
| POST/PUT/DELETE | `/institutions`, `/courses`, `/equipment` | админ |

Фильтры: `/equipment?search=&type=&status=open|closed&institutionId=`,
`/courses?search=&institutionId=`, `/search?q=&type=address|services|equipment`.

## 📚 Технологии

**Frontend** — Next.js 14, React 18, TypeScript, Tailwind CSS, CSS Modules
**Backend** — Node.js, Express, TypeScript, PostgreSQL, Sequelize, JWT, bcryptjs

## 🔑 Тестовые данные

После seed доступны два аккаунта:

- Администратор — `admin@cloudco.ru` / `admin123`
- Пользователь — `user@cloudco.ru` / `user123`

## 📖 Документация

- [Docker Guide](docker-guide.md)
- [Установка backend](server/INSTALLATION.md)
- [API backend](server/README.md)
- [Интеграция фронтенда с API](frontend/BACKEND_INTEGRATION.md)
- [Маршруты фронтенда](frontend/ROUTES.md)
