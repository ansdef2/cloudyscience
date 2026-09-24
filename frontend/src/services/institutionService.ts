// Сервис для работы с учреждениями и курсами
// Интеграция с бэкенд API (server/src/routes/institutions.ts, courses.ts, bookings.ts)

import { Course, Institution } from '@/models/Api'
import { api } from '@/utils/api'

export type { Course }

/** Бэкенд отдаёт workingHours/availableSpots — UI читает hours/spotsLeft/address */
function normalizeCourse(course: any): Course {
  return {
    ...course,
    images: course.images ?? [],
    spotsLeft: course.availableSpots ?? 0,
    modules: course.modules ?? [],
    completedStageIds: course.completedStageIds ?? [],
    address: course.address ?? course.Institution?.address ?? '',
  }
}

function normalizeInstitution(institution: any): Institution {
  return {
    ...institution,
    hours: institution.workingHours ?? '',
    courses: (institution.courses ?? []).map(normalizeCourse),
  }
}

/**
 * Получить список учреждений
 */
export async function getInstitutions(search?: string): Promise<Institution[]> {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    const response = await api.get<any[]>(`/institutions${query}`)
    return response.data.map(normalizeInstitution)
  } catch (error) {
    console.error('Ошибка загрузки учреждений:', error)
    return []
  }
}

/**
 * Получить детали учреждения (вместе с направлениями обучения)
 */
export async function getInstitutionById(id: string): Promise<Institution | null> {
  try {
    const response = await api.get<any>(`/institutions/${id}`)
    return normalizeInstitution(response.data)
  } catch (error) {
    console.error('Ошибка загрузки учреждения:', error)
    return null
  }
}

/**
 * Получить курсы учреждения
 */
export async function getInstitutionCourses(institutionId: string): Promise<Course[]> {
  try {
    const response = await api.get<any[]>(`/institutions/${institutionId}/courses`)
    return response.data.map(normalizeCourse)
  } catch (error) {
    console.error('Ошибка загрузки курсов:', error)
    return []
  }
}

/**
 * Получить детали курса
 */
export async function getCourseById(id: string): Promise<Course | null> {
  try {
    const response = await api.get<any>(`/courses/${id}`)
    return normalizeCourse(response.data)
  } catch (error) {
    console.error('Ошибка загрузки курса:', error)
    return null
  }
}

/**
 * Записаться на курс
 */
export interface CourseBookingRequest {
  courseId: string
  date: string
  time: string
  agreeToDataProcessing: boolean
  wantReminder?: boolean
  addToCalendar?: boolean
}

export async function bookCourse(
  data: CourseBookingRequest
): Promise<{ success: boolean; bookingId?: string }> {
  if (!data.agreeToDataProcessing) {
    throw new Error('Требуется согласие на обработку персональных данных')
  }

  // Запись на курс — то же бронирование, что и для оборудования, только с courseId.
  // Напоминание и календарь бэкендом не моделируются, поэтому уходят в notes.
  const notes = [
    data.wantReminder ? 'Напомнить о занятии' : null,
    data.addToCalendar ? 'Добавить в календарь' : null,
  ]
    .filter(Boolean)
    .join('; ')

  try {
    const response = await api.post<{ id: string }>('/bookings', {
      courseId: data.courseId,
      date: data.date,
      time: data.time,
      notes: notes || undefined,
    })
    return { success: true, bookingId: response.data.id }
  } catch (error) {
    console.error('Ошибка записи на курс:', error)
    throw error
  }
}

/**
 * Отметить этап модуля пройденным или снять отметку.
 * Возвращает полный список отмеченных этапов пользователя.
 */
export async function setStageCompleted(stageId: string, completed: boolean): Promise<string[]> {
  const response = await api.put<{ completedStageIds: string[] }>(`/progress/stages/${stageId}`, {
    completed,
  })
  return response.data.completedStageIds ?? []
}
