// Утилиты для валидации

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const validateDate = (date: string): boolean => {
  const dateObj = new Date(date)
  return !isNaN(dateObj.getTime()) && dateObj >= new Date()
}

export const validateTime = (time: string): boolean => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

export const validateFileSize = (size: number, maxSizeMB: number = 100): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return size <= maxSizeBytes
}

export const validateFileType = (fileName: string, allowedTypes: string[]): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension ? allowedTypes.includes(extension) : false
}
