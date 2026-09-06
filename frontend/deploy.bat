@echo off
chcp 65001 >nul
REM Скрипт для загрузки всех изменений в репозиторий (Windows)

echo ========================================
echo   Загрузка Cloud.co в репозиторий
echo ========================================
echo.

echo [1/5] Проверка настроек Git...
git config --global user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo ВНИМАНИЕ: Git не настроен. Запустите setup-git.bat или настройте вручную:
    echo   git config --global user.name "Ваше Имя"
    echo   git config --global user.email "ваш.email@example.com"
    pause
    exit /b 1
)
echo ✓ Git настроен
echo.

echo [2/5] Проверка статуса git...
git status
echo.

echo [3/5] Добавление всех файлов...
git add .
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось добавить файлы
    pause
    exit /b 1
)
echo ✓ Файлы добавлены
echo.

echo [4/5] Создание коммита...
git commit -m "Complete Cloud.co platform implementation

- All screens from Figma implemented (8/8)
- Booking process with file selection
- File system management
- Search functionality (address, specialists, services)
- API integration ready
- Backend integration documentation
- Error handling and toast notifications
- Dark theme and responsive design
- All components and utilities
- Complete documentation"
if %errorlevel% neq 0 (
    echo ВНИМАНИЕ: Возможно нет изменений для коммита или коммит уже создан
    echo Продолжаем...
)
echo.

echo [5/5] Загрузка в репозиторий...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo Попытка с флагом -u (первый push)...
    git push -u origin main
    if %errorlevel% neq 0 (
        echo ОШИБКА: Не удалось загрузить изменения
        echo Проверьте настройки remote и права доступа
        echo.
        echo Проверьте remote:
        echo   git remote -v
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   ✓ Готово! Все изменения загружены.
echo ========================================
echo.
echo Не забудьте:
echo - Обновить описание репозитория (см. REPOSITORY_DESCRIPTION.md)
echo - Добавить Topics в настройках репозитория
echo.
pause
