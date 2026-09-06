// Сервис для работы с бронированиями
// Интеграция с бэкенд API (server/src/routes/bookings.ts)

import { api } from '@/utils/api'

export interface BookingRequest {
  equipmentId?: string
  courseId?: string
  date: string
  time: string
  endTime?: string
  rentalType?: 'remote' | 'in-person'
  files?: string[]
  location?: string
  notes?: string
}

export interface Booking {
  id: string
  equipmentId?: string
  courseId?: string
  equipment?: {
    id: string
    name: string
  }
  course?: {
    id: string
    title: string
  }
  userId: string
  date: string
  time: string
  endTime?: string
  rentalType: 'remote' | 'in-person'
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  files?: string[]
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Sequelize отдаёт связи с именем модели (Equipment/Course) — UI ждёт lowercase */
function normalizeBooking(booking: any): Booking {
  return {
    ...booking,
    equipment: booking.Equipment ?? undefined,
    course: booking.Course ?? undefined,
  }
}

/**
 * Создать бронирование
 */
export async function createBooking(data: BookingRequest): Promise<Booking> {
  try {
    const response = await api.post<any>('/bookings', data)
    return normalizeBooking(response.data)
  } catch (error) {
    console.error('Ошибка создания бронирования:', error)
    throw error
  }
}

/**
 * Получить список бронирований пользователя
 */
export async function getUserBookings(): Promise<Booking[]> {
  try {
    const response = await api.get<any[]>('/bookings')
    return response.data.map(normalizeBooking)
  } catch (error) {
    console.error('Ошибка загрузки бронирований:', error)
    return []
  }
}

/**
 * Получить детали бронирования
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    const response = await api.get<any>(`/bookings/${id}`)
    return normalizeBooking(response.data)
  } catch (error) {
    console.error('Ошибка загрузки бронирования:', error)
    return null
  }
}

/**
 * Отменить бронирование
 */
export async function cancelBooking(id: string): Promise<void> {
  try {
    await api.delete(`/bookings/${id}`)
  } catch (error) {
    console.error('Ошибка отмены бронирования:', error)
    throw error
  }
}

/**
 * Обновить бронирование
 */
export async function updateBooking(
  id: string,
  data: Partial<BookingRequest> & { status?: Booking['status'] }
): Promise<Booking> {
  try {
    const response = await api.put<any>(`/bookings/${id}`, data)
    return normalizeBooking(response.data)
  } catch (error) {
    console.error('Ошибка обновления бронирования:', error)
    throw error
  }
}
