// Сервис для работы с файлами
// ВНИМАНИЕ: ручки /files/* в бэкенде (server/) пока не реализованы — файловое
// хранилище отдельная задача. Сервис оставлен как готовый клиент под них.

import { api, getAuthToken } from '@/utils/api'

export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  mimeType?: string
  uploadedAt: string
  modifiedAt?: string
  url?: string
  changed?: boolean
}

export interface UploadFileResponse {
  id: string
  name: string
  size: number
  url: string
}

/**
 * Получить список файлов
 */
export async function getFiles(): Promise<FileInfo[]> {
  try {
    const response = await api.get<FileInfo[]>('/files')
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки файлов:', error)
    return []
  }
}

/**
 * Загрузить файл
 */
export async function uploadFile(file: File): Promise<UploadFileResponse> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const token = getAuthToken()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/files/upload`,
      {
        method: 'POST',
        body: formData,
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      }
    )
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Ошибка загрузки файла')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    throw error
  }
}

/**
 * Скачать файл
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  try {
    const token = getAuthToken()

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/files/${fileId}/download`,
      {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      }
    )
    
    if (!response.ok) {
      throw new Error('Ошибка скачивания файла')
    }
    
    return await response.blob()
  } catch (error) {
    console.error('Ошибка скачивания файла:', error)
    throw error
  }
}

/**
 * Удалить файл
 */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await api.delete(`/files/${fileId}`)
  } catch (error) {
    console.error('Ошибка удаления файла:', error)
    throw error
  }
}

/**
 * Загрузить файлы в облако
 */
export async function uploadToCloud(fileIds: string[]): Promise<void> {
  try {
    await api.post('/files/upload-to-cloud', { fileIds })
  } catch (error) {
    console.error('Ошибка загрузки в облако:', error)
    throw error
  }
}

/**
 * Сохранить файлы сессии
 */
export interface SaveSessionFilesRequest {
  sessionId: string
  fileIds: string[]
  action: 'save' | 'delete'
}

export async function saveSessionFiles(data: SaveSessionFilesRequest): Promise<void> {
  try {
    await api.post('/files/save-session', data)
  } catch (error) {
    console.error('Ошибка сохранения файлов сессии:', error)
    throw error
  }
}
