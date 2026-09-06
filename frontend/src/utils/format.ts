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

/**
 * Русское склонение по числу: pluralize(2, ['место', 'места', 'мест']) → 'места'
 * Формы: 1 место, 2 места, 5 мест.
 */
export const pluralize = (count: number, forms: [string, string, string]): string => {
  const abs = Math.abs(count) % 100
  const tail = abs % 10

  if (abs > 10 && abs < 20) return forms[2]
  if (tail > 1 && tail < 5) return forms[1]
  if (tail === 1) return forms[0]
  return forms[2]
}
