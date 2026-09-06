# 🚀 Инструкция по загрузке в репозиторий

## Текущий статус

**Репозиторий настроен:**
- Remote: `https://github.com/Alpharius-Omegonus/site_cloudco.lovable.app.git`
- Ветка: `main`

## 📤 Быстрая загрузка

### Вариант 1: Использовать скрипт (Windows)

```bash
deploy.bat
```

### Вариант 2: Использовать скрипт (Linux/Mac)

```bash
chmod +x deploy.sh
./deploy.sh
```

### Вариант 3: Ручные команды

Выполните в терминале (Git Bash рекомендуется):

```bash
# 1. Проверка статуса
git status

# 2. Добавление всех файлов
git add .

# 3. Создание коммита
git commit -m "Complete Cloud.co platform implementation

- All screens from Figma implemented
- Booking process with file selection
- File system management
- Search functionality
- API integration ready
- Backend integration documentation
- Error handling and toast notifications
- Dark theme and responsive design
- All components and utilities
- Complete documentation"

# 4. Загрузка в репозиторий
git push origin main
```

## 📋 Что будет загружено

### ✅ Код проекта
- Все компоненты React (15+)
- Все экраны приложения (12)
- API сервисы (5 сервисов)
- Утилиты и хуки
- Стили и конфигурация

### ✅ Документация
- README.md
- QUICK_START.md
- BACKEND_INTEGRATION.md
- SETUP.md
- TODO.md
- И другие файлы документации

### ✅ Конфигурация
- package.json
- tsconfig.json
- next.config.js
- .gitignore
- env.example

### ✅ Ресурсы
- SVG placeholder изображения
- Скрипты

## ⚠️ Если нужно изменить remote

Если нужно загрузить в другой репозиторий (например, `ansdef/cloudco`):

```bash
# Проверить текущий remote
git remote -v

# Изменить remote
git remote set-url origin https://github.com/ansdef/cloudco.git

# Или добавить новый remote
git remote add upstream https://github.com/ansdef/cloudco.git
```

## ✅ Проверка после загрузки

После успешного push:
1. Откройте репозиторий на GitHub
2. Проверьте, что все файлы загружены
3. Убедитесь, что README.md отображается корректно

## 🔍 Проверка перед загрузкой

```bash
# Посмотреть что будет загружено
git status

# Посмотреть изменения
git diff --cached

# Отменить изменения (если нужно)
git reset
```
