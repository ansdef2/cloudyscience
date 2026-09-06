# 🚀 Быстрый старт

## За 5 минут до запуска

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения (опционально)

Если у вас запущен бэкенд сервер:

```bash
# Создайте .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
```

Если бэкенд не запущен, приложение будет работать с hardcoded данными.

### 3. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## ✅ Готово!

Приложение запущено и готово к использованию.

## 🔧 Что дальше?

### С бэкендом

1. Запустите бэкенд из каталога `server/` (`cd ../server && npm run dev`)
2. Настройте `.env.local` с URL бэкенда
3. См. [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) для деталей

### Без бэкенда

Приложение работает с hardcoded данными для демонстрации всех функций.

## 📝 Полезные команды

```bash
# Разработка
npm run dev

# Сборка
npm run build
npm start

# Проверка кода
npm run lint

# Создание placeholder изображений
npm run setup:images
```
