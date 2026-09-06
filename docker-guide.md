# Docker Guide - CloudCo

## Быстрый старт

### 1. Создайте файл .env

```bash
cp .env.example .env
```

Отредактируйте `.env` с нужными настройками.

### 2. Запустите с помощью Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Остановка с удалением volumes (удалит все данные БД)
docker-compose down -v
```

### 3. Инициализация базы данных

Схема создаётся автоматически при старте бэкенда. Демо-данные заливаются отдельно:

```bash
docker-compose exec backend node dist/config/seed.js
```

Справочник оборудования из `server/data/models.db` заливается вместе с seed.
Перезалить только его, не трогая остальное:

```bash
docker-compose exec backend node dist/config/importEquipmentModels.js
```

> ⚠️ Seed выполняет `sequelize.sync({ force: true })` — таблицы пересоздаются,
> существующие данные теряются. Запускайте его только на пустой базе.
> Переменная `SEED_ON_START=true` делает то же самое при каждом старте
> контейнера, поэтому в проде её держат выключенной.

### 4. Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **PostgreSQL**: localhost:5432

## Отдельные сервисы

### Только база данных

```bash
docker-compose up -d postgres
```

### Только backend

```bash
docker-compose up -d postgres backend
```

### Только frontend (требует запущенный backend на хосте)

```bash
docker-compose up -d frontend
```

> `NEXT_PUBLIC_API_URL` вшивается в бандл Next.js **на этапе сборки образа**,
> а не читается в рантайме. После смены адреса API нужен `docker-compose build frontend`.

## Полезные команды

### Просмотр логов
```bash
docker-compose logs -f backend    # Backend логи
docker-compose logs -f frontend  # Frontend логи
docker-compose logs -f postgres  # Database логи
```

### Выполнение команд в контейнере
```bash
docker-compose exec backend sh          # Зайти в backend контейнер
docker-compose exec postgres psql -U postgres cloudco  # Подключиться к БД
```

### Пересборка после изменений
```bash
docker-compose build backend    # Пересобрать только backend
docker-compose build frontend   # Пересобрать только frontend
docker-compose build            # Пересобрать все
docker-compose up -d --build    # Пересобрать и запустить
```

### Очистка
```bash
docker-compose down           # Остановить и удалить контейнеры
docker-compose down -v        # + Удалить volumes (удалит данные БД)
docker-compose down --rmi all # + Удалить образы
docker system prune           # Очистить неиспользуемые данные Docker
```

## Тестовые данные

После выполнения seed скрипта:

**Администратор:**
- Email: admin@cloudco.ru
- Password: admin123

**Пользователь:**
- Email: user@cloudco.ru
- Password: user123

## Структура Docker

```
cloudco/
├── docker-compose.yml       # Оркестрация всех сервисов
│
├── frontend/                # Next.js приложение
│   ├── Dockerfile           # Frontend образ
│   └── .dockerignore        # Исключения для frontend
│
└── server/                  # Express API
    ├── Dockerfile           # Backend образ
    └── .dockerignore        # Исключения для backend
```

## Production Build

Оба образа собираются в production-режиме по умолчанию: фронтенд выполняет
`next build` и стартует через `next start`, бэкенд компилируется в `dist/` и
запускается как `node dist/index.js`.

Что стоит проверить перед деплоем:

1. `JWT_SECRET` — заменить значение по умолчанию.
2. `CORS_ORIGIN` — указать реальный домен фронтенда (можно перечислить через запятую).
3. `NEXT_PUBLIC_API_URL` — публичный адрес API; менять до сборки образа.
4. `SEED_ON_START` — оставить `false`, иначе база будет пересоздаваться при рестарте.
