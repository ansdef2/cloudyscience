# Cloud.co - Платформа облачного коворкинга

## Описание проекта

Платформа для аренды оборудования и компьютеров с удаленным управлением, файловой системой и возможностью работы из дома.

## Дизайн

- **Figma**: https://www.figma.com/design/WVj3q2gsEAK6X38UIfBvGY/%D0%9E%D0%B1%D0%BB%D0%B0%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%BE%D0%B2%D0%BE%D1%80%D0%BA%D0%B8%D0%BD%D0%B3?node-id=40-364&t=lm3QIuLGwrfabwE7-1
- **Сайт**: https://cloudco.lovable.app
- **Бэкенд**: каталог `server/` в этом же репозитории

## 🚀 Быстрый запуск

### Установка и запуск

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск в режиме разработки
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

**Подробнее:** [QUICK_START.md](./QUICK_START.md)

## 📋 Требования

- Node.js 18+ и npm
- Git (для клонирования)

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env.local` на основе `env.example`:

```bash
cp env.example .env.local
```

Отредактируйте `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Интеграция с бэкендом

Фронтенд работает с бэкендом из каталога `server/` этого же репозитория.

**Подробная инструкция:** [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)

## 📁 Структура проекта

```
src/
├── app/              # Next.js страницы (App Router)
├── components/       # React компоненты
├── screens/          # Экраны приложения
├── services/         # API сервисы для интеграции с бэкендом
├── hooks/            # React хуки
├── utils/            # Утилиты (API клиент, форматирование, валидация)
└── styles/           # Глобальные стили и шрифты
```

## 🎨 Технологии

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** CSS Modules
- **Fonts:** Onest (Google Fonts) + Playfair Display

## ✅ Реализованные функции

- ✅ Все экраны из Figma (8/8)
- ✅ Процесс бронирования оборудования
- ✅ Файловая система
- ✅ Поиск (по адресу, специалистам, услугам)
- ✅ API клиент и сервисы (готовы к интеграции)
- ✅ Обработка ошибок и уведомления
- ✅ Темная тема
- ✅ Адаптивный дизайн

## 📚 Документация

- [QUICK_START.md](./QUICK_START.md) - быстрый старт за 5 минут
- [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) - интеграция с бэкендом
- [SETUP.md](./SETUP.md) - настройка проекта
- [ROUTES.md](./ROUTES.md) - описание маршрутов

## 📤 Загрузка в репозиторий

Все файлы созданы локально. Для загрузки выполните:

**Windows:**
```bash
.\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Или вручную:**
```bash
git add .
git commit -m "Complete Cloud.co platform implementation"
git push origin main
```


## 🔗 Связанные репозитории

- **Backend API**: [server/README.md](../server/README.md)
- **Дизайн**: [Figma](https://www.figma.com/design/WVj3q2gsEAK6X38UIfBvGY/%D0%9E%D0%B1%D0%BB%D0%B0%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%BE%D0%B2%D0%BE%D1%80%D0%BA%D0%B8%D0%BD%D0%B3?node-id=40-364&t=lm3QIuLGwrfabwE7-1)

## 📝 Лицензия

См. LICENSE файл в репозитории


UPD 1: # 📝 Описание для GitHub репозитория

Скопируйте этот текст в описание репозитория на GitHub (Settings → General → Repository details → Description):

---

**Frontend приложение для платформы облачного коворкинга Cloud.co. Платформа для аренды оборудования и компьютеров с удаленным управлением, файловой системой и возможностью работы из дома. Реализованы все экраны из Figma, процесс бронирования, поиск, API интеграция. Next.js 14 + TypeScript.**

---

## 🎯 Краткая версия (для ограниченного поля):

**Платформа облачного коворкинга Cloud.co - Frontend на Next.js 14. Аренда оборудования с удаленным управлением, файловая система, бронирование. Все экраны из Figma реализованы.**

---

## 📋 Полная версия (для README или About):

**Cloud.co** - это современная платформа для аренды оборудования и компьютеров с удаленным управлением. Позволяет пользователям арендовать мощное оборудование (VR-очки, фрезерные станки и др.) и работать с ним удаленно через веб-интерфейс.

### ✨ Основные возможности:
- 🖥️ Каталог оборудования с 3D моделями
- 📅 Система бронирования с календарем
- 📁 Файловая система для управления проектами
- 🔍 Поиск по адресу, специалистам и услугам
- 🎨 Темная тема и адаптивный дизайн
- 🔌 Готовая интеграция с бэкенд API

### 🛠️ Технологии:
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** CSS Modules
- **Fonts:** Onest (Google Fonts) + Playfair Display

### 🚀 Быстрый старт:
```bash
npm install
npm run dev
```

### 🔗 Связанные репозитории:
- **Backend:** каталог `server/`
- **Дизайн:** [Figma](https://www.figma.com/design/WVj3q2gsEAK6X38UIfBvGY/%D0%9E%D0%B1%D0%BB%D0%B0%D1%87%D0%BD%D1%8B%D0%B9-%D0%BA%D0%BE%D0%B2%D0%BE%D1%80%D0%BA%D0%B8%D0%BD%D0%B3)

---

## 📌 Теги (Topics) для репозитория:

Добавьте эти теги в настройках репозитория (Settings → General → Topics):

```
nextjs
typescript
react
cloud-computing
coworking
equipment-rental
file-system
booking-system
dark-theme
responsive-design
figma-design
api-integration
```

---

## 🎨 Иконка и баннер:

Рекомендуется добавить:
- **Social preview image:** Логотип Cloud.co или скриншот главной страницы
- **Topics:** См. список выше

---

## 📝 Как использовать:

1. **Для описания репозитория:**
   - Скопируйте "Краткую версию" в поле Description в настройках репозитория

2. **Для About секции:**
   - Используйте "Полную версию" или ссылку на README.md

3. **Для Topics:**
   - Добавьте теги из списка выше

4. **Для Social Preview:**
   - Загрузите изображение логотипа или скриншот приложения
