// Промокоды на оборудование — кнопка «Забрать промокод»
// Интеграция с бэкенд API (server/src/routes/promocodes.ts)

import { api } from '@/utils/api'

export interface Promocode {
  id: string
  equipmentId?: string
  code: string
  title: string
  description?: string
  discount?: number
  expiresAt?: string
}

export async function getPromocodes(equipmentId?: string): Promise<Promocode[]> {
  try {
    const query = equipmentId ? `?equipmentId=${encodeURIComponent(equipmentId)}` : ''
    const response = await api.get<Promocode[]>(`/promocodes${query}`)
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки промокодов:', error)
    return []
  }
}

/** Забирает доступный промокод для оборудования */
export async function claimPromocode(equipmentId: string): Promise<Promocode> {
  const response = await api.post<Promocode>('/promocodes/claim', { equipmentId })
  return response.data
}
