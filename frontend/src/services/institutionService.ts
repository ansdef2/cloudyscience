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
    isEnrolled: course.isEnrolled ?? false,
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

export interface EnrollmentResult {
  isEnrolled: boolean
  totalSpots: number
  availableSpots: number
}

/**
 * Записаться на курс. Повторная запись и запись без мест отклоняются
 * сервером с 409 — код причины в ApiError.data.code.
 */
export async function enrollInCourse(courseId: string): Promise<EnrollmentResult> {
  const response = await api.post<EnrollmentResult>(`/courses/${courseId}/enroll`)
  return response.data
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
