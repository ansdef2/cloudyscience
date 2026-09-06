# Инструкция по настройке проекта

## Установка зависимостей

```bash
npm install
```

## Настройка шрифтов

### Onest
Шрифт Onest автоматически загружается из Google Fonts через `next/font/google`.

### CalvinoDisplayItalic
1. Скачайте файл шрифта `CalvinoDisplayItalic.woff2` (или другой формат)
2. Поместите его в папку `src/assets/fonts/`
3. Если используется другой формат, обновите путь в `src/styles/fonts.ts`

## Добавление изображений

### Изображения оборудования
Поместите изображения в папку `public/equipment/`:
- `oculus-rift.jpg` - изображение Oculus Rift
- `oculus-rift-3d.glb` - 3D модель Oculus Rift (для S3 хранилища)
- `milling-machine.jpg` - изображение фрезерного станка
- и другие изображения оборудования

### Изображения профилей и учреждений
- `public/profile.jpg` - аватар пользователя
- `public/institution/kvantorium-1.jpg` - изображения учреждений

## Настройка S3 хранилища

Для интеграции с S3 хранилищем:

1. Создайте файл `.env.local`:
```env
NEXT_PUBLIC_S3_BUCKET=your-bucket-name
NEXT_PUBLIC_S3_REGION=your-region
NEXT_PUBLIC_S3_ACCESS_KEY=your-access-key
NEXT_PUBLIC_S3_SECRET_KEY=your-secret-key
```

2. Установите AWS SDK:
```bash
npm install @aws-sdk/client-s3
```

3. Создайте утилиту для загрузки в S3 (опционально):
```typescript
// src/utils/s3.ts
// Код для работы с S3
```

## Интеграция 3D моделей

Для полноценной работы 3D моделей установите Three.js:

```bash
npm install three @react-three/fiber @react-three/drei
```

Затем обновите компонент `Model3D.tsx` для использования React Three Fiber.

## Запуск проекта

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Сборка для продакшена

```bash
npm run build
npm start
```

## Примечания

- Все изображения должны быть оптимизированы для веба
- 3D модели должны быть в формате GLB или GLTF
- Для продакшена настройте CDN для статических файлов
