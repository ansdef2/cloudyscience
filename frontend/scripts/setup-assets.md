# Инструкция по настройке ресурсов

## Шрифты

### Onest (без засечек)
✅ **Уже подключен через Google Fonts** - работает автоматически!

### CalvinoDisplayItalic (с засечками)
Используется **Playfair Display** как бесплатная альтернатива через Google Fonts.

Если у вас есть файл `CalvinoDisplayItalic.woff2`, поместите его в `src/assets/fonts/` и он будет использован вместо Playfair Display.

## Изображения

### Автоматическая загрузка
Запустите скрипт для создания placeholder'ов:
```bash
node scripts/download-images.js
```

### Ручная загрузка реальных изображений

#### Источники бесплатных изображений:
1. **Unsplash** (https://unsplash.com) - бесплатные высококачественные фото
2. **Pexels** (https://www.pexels.com) - бесплатные стоковые фото
3. **Pixabay** (https://pixabay.com) - бесплатные изображения

#### Необходимые изображения:

**Оборудование** (`public/equipment/`):
- `oculus-rift.jpg` - поиск: "Oculus Rift VR headset"
- `milling-machine.jpg` - поиск: "CNC milling machine"
- `milling-machine-2.jpg` - поиск: "industrial milling machine"

**Профили** (`public/`):
- `profile.jpg` - поиск: "professional headshot" или "business person portrait"

**Учреждения** (`public/institution/`):
- `kvantorium-1.jpg` - поиск: "modern building" или "educational institution"

**Главная страница** (`public/`):
- `computer.jpg` - поиск: "modern desktop computer" или "gaming PC"
- `equipment.jpg` - поиск: "industrial equipment" или "manufacturing"

### Рекомендации:
- Формат: JPG или PNG
- Размер: оптимизировать для веба (не более 500KB на изображение)
- Разрешение: минимум 800x600px для оборудования, 1200x600px для учреждений
