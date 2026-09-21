# Инструкция по установке и запуску

## Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

## Установка

1. Установите зависимости backend:
```bash
cd server
npm install
```

2. Установите зависимости frontend:
```bash
cd ..
npm install
```

3. Создайте базу данных PostgreSQL:
```bash
createdb cloudco
```

4. Настройте переменные окружения для backend:
```bash
cd server
cp .env.example .env
```

Отредактируйте `server/.env`:
```
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudco
DB_USER=postgres
DB_PASSWORD=your_password

CORS_ORIGIN=http://localhost:5173
```

5. Запустите seed скрипт для создания тестовых данных:
```bash
npm run db:seed
```

6. Запустите backend сервер:
```bash
npm run dev
```

7. В отдельном терминале запустите frontend:
```bash
cd ..
npm run dev
```

## Учётные записи после сида

Создаётся один администратор — `admin@cloudyscience.ru`. Пароль задаётся
переменной `SEED_ADMIN_PASSWORD` при запуске сида; в production без неё
сид останавливается, вне production берётся `admin123`.

```
SEED_ADMIN_PASSWORD='ваш-пароль' npm run db:seed
```

Демо-авторы постов (`anton@`, `masha@`) получают случайные пароли:
они нужны как подписи под контентом, входить ими не предполагается.

## API Endpoints

Backend API доступен на `http://localhost:3001/api`

Frontend доступен на `http://localhost:5173`

## Структура проекта

```
cloudco/
├── src/                    # Frontend React приложение
│   ├── components/        # React компоненты
│   ├── pages/            # Страницы приложения
│   ├── hooks/            # React hooks
│   └── lib/              # Утилиты и API клиент
├── server/                # Backend API
│   ├── src/
│   │   ├── controllers/  # Контроллеры
│   │   ├── models/       # Sequelize модели
│   │   ├── routes/       # API маршруты
│   │   ├── middleware/   # Express middleware
│   │   └── utils/        # Утилиты
│   └── package.json
└── package.json          # Frontend package.json
```
