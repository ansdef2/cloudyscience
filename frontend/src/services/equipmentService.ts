// Сервис для работы с оборудованием
// Интеграция с бэкенд API (server/src/routes/equipment.ts)

import { Equipment } from '@/models/Equipment'
import { api } from '@/utils/api'

export interface EquipmentFilters {
  type?: string
  status?: 'open' | 'closed'
  search?: string
  institutionId?: string
}

/**
 * Бэкенд отдаёт Equipment в терминах модели Sequelize (workingHours, isOpen,
 * вложенный Institution), а UI ожидает плоские hours/status/address.
 */
function normalizeEquipment(item: any): Equipment {
  return {
    ...item,
    hours: item.workingHours ?? '',
    status: item.isOpen ? 'open' : 'closed',
    address: item.Institution?.address ?? '',
    type: item.type ?? '',
  }
}

/**
 * Получить список оборудования
 */
export async function getEquipmentList(filters?: EquipmentFilters): Promise<Equipment[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.institutionId) params.append('institutionId', filters.institutionId)

    const query = params.toString()
    const endpoint = query ? `/equipment?${query}` : '/equipment'

    const response = await api.get<any[]>(endpoint)
    return response.data.map(normalizeEquipment)
  } catch (error) {
    console.error('Ошибка загрузки оборудования:', error)
    return []
  }
}

/**
 * Получить детали оборудования по ID
 */
export async function getEquipmentById(id: string): Promise<Equipment | null> {
  try {
    const response = await api.get<any>(`/equipment/${id}`)
    return normalizeEquipment(response.data)
  } catch (error) {
    console.error('Ошибка загрузки оборудования:', error)
    return null
  }
}

/**
 * Проверить доступность оборудования на дату и время.
 * Отдельной ручки нет — считаем занятость по активным бронированиям.
 */
export async function checkEquipmentAvailability(
  equipmentId: string,
  date: string,
  time: string
): Promise<boolean> {
  try {
    const response = await api.get<any[]>('/bookings')
    return !response.data.some(
      (booking) =>
        booking.equipmentId === equipmentId &&
        booking.time === time &&
        String(booking.date).slice(0, 10) === String(date).slice(0, 10) &&
        booking.status !== 'cancelled'
    )
  } catch (error) {
    console.error('Ошибка проверки доступности:', error)
    return false
  }
}

export interface AvailabilitySlot {
  time: string
  status: 'free' | 'taken' | 'past'
  available: boolean
}

export interface Availability {
  date: string
  /** «Сегодня» и последний день брони — по времени площадок, а не браузера */
  today: string
  lastDate: string
  /** Оборудование не принимает брони */
  closed?: boolean
  workingHours: { start: string; end: string }
  slots: AvailabilitySlot[]
}

/** Слоты оборудования на день: занятые другими бронями и прошедшие недоступны */
export async function getAvailability(equipmentId: string, date?: string): Promise<Availability> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  const response = await api.get<Availability>(`/equipment/${equipmentId}/availability${query}`)
  return response.data
}
