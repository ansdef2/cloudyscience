# CloudCo Backend API

Backend API для сервиса бронирования оборудования и курсов.

## Технологии

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT Authentication
- bcryptjs для хеширования паролей

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте базу данных PostgreSQL и создайте файл `.env`:
```bash
cp .env.example .env
```

3. Заполните данные в `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudco
DB_USER=postgres
DB_PASSWORD=your_password
```

4. Создайте базу данных:
```bash
createdb cloudco
```

5. Запустите seed скрипт для создания тестовых данных:
```bash
npm run db:seed
```

## Запуск

### Разработка
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Получить профиль (требует токен)

### Учреждения
- `GET /api/institutions` - Список учреждений
- `GET /api/institutions/:id` - Учреждение по ID
- `POST /api/institutions` - Создать учреждение (только админ)
- `PUT /api/institutions/:id` - Обновить учреждение (только админ)
- `DELETE /api/institutions/:id` - Удалить учреждение (только админ)

### Курсы
- `GET /api/courses` - Список курсов
- `GET /api/courses/:id` - Курс по ID
- `POST /api/courses` - Создать курс (только админ)
- `PUT /api/courses/:id` - Обновить курс (только админ)
- `DELETE /api/courses/:id` - Удалить курс (только админ)

### Оборудование
- `GET /api/equipment` - Список оборудования
- `GET /api/equipment/:id` - Оборудование по ID
- `POST /api/equipment` - Создать оборудование (только админ)
- `PUT /api/equipment/:id` - Обновить оборудование (только админ)
- `DELETE /api/equipment/:id` - Удалить оборудование (только админ)

### Бронирования
- `GET /api/bookings` - Список бронирований (требует токен)
- `GET /api/bookings/:id` - Бронирование по ID
- `POST /api/bookings` - Создать бронирование (требует токен)
- `PUT /api/bookings/:id` - Обновить бронирование
- `DELETE /api/bookings/:id` - Отменить бронирование

### Пользователи
- `GET /api/users` - Список пользователей (только админ)
- `GET /api/users/:id` - Пользователь по ID
- `PUT /api/users/:id` - Обновить пользователя
- `DELETE /api/users/:id` - Удалить пользователя

## Учётные записи после сида

Создаётся один администратор — `admin@cloudyscience.ru`. Пароль задаётся
переменной `SEED_ADMIN_PASSWORD` при запуске сида; в production без неё
сид останавливается, вне production берётся `admin123`.

```
SEED_ADMIN_PASSWORD='ваш-пароль' npm run db:seed
```

Демо-авторы постов (`anton@`, `masha@`) получают случайные пароли:
они нужны как подписи под контентом, входить ими не предполагается.

## Переменные окружения

- `PORT` - Порт сервера (по умолчанию 3001)
- `NODE_ENV` - Окружение (development/production)
- `JWT_SECRET` - Секретный ключ для JWT
- `JWT_EXPIRES_IN` - Время жизни токена
- `DB_*` - Параметры подключения к БД
- `CORS_ORIGIN` - Разрешенный origin для CORS
