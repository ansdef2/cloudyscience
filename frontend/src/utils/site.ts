/** Адреса для серверных частей Next (метаданные, карта сайта) */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
/** Адрес сайта — из адреса API: https://cloudyscience.ru/api → https://cloudyscience.ru */
export const SITE_URL = API_URL.replace(/\/api\/?$/, '')
