// Константы приложения

export const APP_NAME = 'Cloud.co'
export const APP_DESCRIPTION = 'Платформа для аренды оборудования и компьютеров с удаленным управлением'

// Цвета темы
export const COLORS = {
  primary: '#8b5cf6',
  secondary: '#3b82f6',
  accent: '#ec4899',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
}

// Время работы по умолчанию
export const DEFAULT_HOURS = {
  open: '09:00',
  close: '18:00',
}

// Статусы оборудования
export const EQUIPMENT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  MAINTENANCE: 'maintenance',
} as const

// Типы аренды
export const RENTAL_TYPES = {
  REMOTE: 'remote',
  IN_PERSON: 'in-person',
} as const

// Шаги процесса бронирования
export const BOOKING_STEPS = {
  FILES: 'files',
  TIME: 'time',
  CONFIRM: 'confirm',
} as const

// Форматы файлов
export const SUPPORTED_FILE_TYPES = {
  '3D_MODELS': ['.stl', '.obj', '.glb', '.gltf'],
  'GCODE': ['.gcode', '.nc'],
  'IMAGES': ['.jpg', '.jpeg', '.png', '.svg'],
  'DOCUMENTS': ['.pdf', '.doc', '.docx'],
  'CONFIG': ['.json', '.xml', '.yaml'],
} as const

// Максимальный размер файла (в MB)
export const MAX_FILE_SIZE = 100

// Время автоматической загрузки файлов до сессии (в часах)
export const AUTO_UPLOAD_TIME_BEFORE_SESSION = 1

// Время автоматического удаления файлов после сессии (в часах)
export const AUTO_DELETE_TIME_AFTER_SESSION = 1
