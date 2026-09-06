// Утилиты для форматирования

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export const formatDate = (date: Date | string, format: 'short' | 'long' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (format === 'short') {
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    })
  }
  
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatTime = (time: string): string => {
  // Форматирование времени из формата "HH:mm" в "HH:MM"
  return time
}

export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} м от вас`
  }
  return `${distance.toFixed(2)} км от вас`
}

export const formatPhone = (phone: string): string => {
  // Форматирование телефона в российский формат
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  return phone
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Календари в UI отдают только номер дня, а API ждёт полноценную дату.
 * month — номер месяца с единицы (7 = июль).
 */
export const toIsoDate = (year: number, month: number, day: number | string): string => {
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}
