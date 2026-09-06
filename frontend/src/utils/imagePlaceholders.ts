// Утилита для работы с placeholder изображениями
// В продакшене эти пути будут заменены на реальные изображения

export const getImagePlaceholder = (path: string): string => {
  // Если изображение существует, вернуть путь
  // Иначе вернуть placeholder через data URI или внешний сервис
  return path
}

// Placeholder изображения через data URI (SVG)
export const createPlaceholderSVG = (width: number, height: number, text: string = ''): string => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1f1f1f"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#6b6b6b" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `.trim()
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// Пути к изображениям с fallback на placeholder
export const IMAGE_PATHS = {
  equipment: {
    oculusRift: '/equipment/oculus-rift.jpg',
    oculusRift3D: '/equipment/oculus-rift-3d.glb',
    millingMachine: '/equipment/milling-machine.jpg',
    millingMachine2: '/equipment/milling-machine-2.jpg',
  },
  profile: '/profile.jpg',
  institution: {
    kvantorium1: '/institution/kvantorium-1.jpg',
  },
  home: {
    computer: '/computer.jpg',
    equipment: '/equipment.jpg',
  },
} as const

// Функция для получения изображения с fallback
export const getImageWithFallback = (path: string, fallbackText?: string): string => {
  // В реальном приложении здесь будет проверка существования файла
  // Пока возвращаем путь, а в компонентах добавим обработку ошибок
  return path
}
