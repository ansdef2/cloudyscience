#!/bin/bash
# Скрипт для загрузки всех изменений в репозиторий

echo "📦 Проверка статуса git..."
git status

echo ""
echo "➕ Добавление всех файлов..."
git add .

echo ""
echo "💾 Создание коммита..."
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

echo ""
echo "📤 Загрузка в репозиторий..."
git push origin main

echo ""
echo "✅ Готово! Все изменения загружены."
