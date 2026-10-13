// Загрузка файлов: к броням (видят автор, команда и администратор)
// и картинки каталога (публичные). Сервер — server/src/routes/uploads.ts

import { api, API_BASE_URL, ApiError, getAuthToken } from '@/utils/api'

export interface UploadedFile {
  id: string
  name: string
  size: number
  url?: string
}

/** Расширения, которые принимает сервер для файлов брони (config/uploads.ts) */
export const BOOKING_FILE_ACCEPT = [
  '.stl', '.obj', '.3mf', '.amf', '.ply', '.fbx', '.glb', '.gltf', '.blend', '.f3d',
  '.step', '.stp', '.iges', '.igs', '.dxf', '.dwg', '.svg',
  '.gcode', '.gco', '.nc', '.tap', '.ngc',
  '.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.md', '.csv', '.json',
  '.ino', '.py', '.c', '.cpp', '.h', '.zip', '.7z', '.rar',
].join(',')

export const BOOKING_FILE_MAX_MB = 50
export const BOOKING_FILES_MAX = 10
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif'

/** Адрес публичного файла: сервер отдаёт путь /api/files/..., сайт может жить на другом домене */
export function fileUrl(path?: string | null) {
  if (!path) return undefined
  if (/^https?:\/\//.test(path) || !path.startsWith('/api/')) return path
  return API_BASE_URL.replace(/\/api\/?$/, '') + path
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}

/**
 * Отправка multipart с прогрессом. fetch прогресс отправки не отдаёт,
 * поэтому XMLHttpRequest.
 */
function sendFile<T>(endpoint: string, file: File, onProgress?: (share: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE_URL}${endpoint}`)
    const token = getAuthToken()
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`)

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    request.onload = () => {
      let body: any = null
      try {
        body = JSON.parse(request.responseText)
      } catch {
        // Ответ не JSON — например, прокси оборвал слишком большой файл
      }
      if (request.status >= 200 && request.status < 300) resolve(body as T)
      else if (request.status === 413) reject(new ApiError(body?.error ?? 'Файл слишком большой', 413, body))
      else reject(new ApiError(body?.error ?? 'Не удалось загрузить файл', request.status, body))
    }
    request.onerror = () => reject(new ApiError('Ошибка сети при загрузке', 0))
    request.send(form)
  })
}

export const uploadBookingFile = (file: File, onProgress?: (share: number) => void) =>
  sendFile<UploadedFile>('/uploads', file, onProgress)

/** Картинка каталога или поста (только администратор) */
export const uploadImage = (file: File) => sendFile<UploadedFile>('/uploads/images', file)

/** Свой аватар */
export const uploadAvatar = (file: File) => sendFile<{ avatar: string }>('/users/me/avatar', file)

export async function deleteUpload(id: string) {
  await api.delete(`/uploads/${id}`)
}

/** Скачивание закрытого файла: нужен токен, поэтому через fetch и blob, а не ссылкой */
export async function downloadUpload(id: string, name: string) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}/uploads/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.error ?? 'Не удалось скачать файл', response.status, body)
  }

  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
