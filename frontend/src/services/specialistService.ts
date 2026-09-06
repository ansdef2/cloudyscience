// Специалисты — вкладка «По специалистам» в поиске
// Интеграция с бэкенд API (server/src/routes/specialists.ts)

import { Institution } from '@/models/Api'
import { api } from '@/utils/api'

export interface Specialist {
  id: string
  institutionId?: string
  Institution?: Institution
  name: string
  position?: string
  avatar?: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export async function getSpecialists(search?: string): Promise<Specialist[]> {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await api.get<Specialist[]>(`/specialists${query}`)
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки специалистов:', error)
    return []
  }
}

export async function getSpecialistById(id: string): Promise<Specialist | null> {
  try {
    const response = await api.get<Specialist>(`/specialists/${id}`)
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки специалиста:', error)
    return null
  }
}
