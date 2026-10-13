// Люди: эксперты (консультации) и обучающиеся (чаты и команды)
// API: server/src/routes/specialists.ts, users.ts, consultations.ts

import { api } from '@/utils/api'

export interface Expert {
  id: string
  name: string
  position?: string
  avatar?: string
  isAvailable: boolean
  Institution?: { id: string; name: string; address: string }
}

export interface Learner {
  id: string
  name: string
  avatar?: string | null
}

export type ConsultationStatus = 'new' | 'confirmed' | 'done' | 'cancelled'

export interface Consultation {
  id: string
  message?: string | null
  preferredDate?: string | null
  preferredTime?: string | null
  status: ConsultationStatus
  createdAt: string
  Specialist?: Expert
  User?: { id: string; name: string; email?: string }
}

export const CONSULTATION_STATUS: Record<ConsultationStatus, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  done: 'Проведена',
  cancelled: 'Отменена',
}

const query = (search?: string) => (search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '')

export async function getExperts(search?: string): Promise<Expert[]> {
  const response = await api.get<Expert[]>(`/specialists${query(search)}`)
  return response.data
}

/** Только для вошедших: имя и аватар, без почты */
export async function getLearners(search?: string): Promise<Learner[]> {
  const response = await api.get<Learner[]>(`/users/directory${query(search)}`)
  return response.data
}

export async function requestConsultation(
  expertId: string,
  data: { message?: string; preferredDate?: string; preferredTime?: string }
): Promise<Consultation> {
  const response = await api.post<Consultation>(`/specialists/${expertId}/consultations`, data)
  return response.data
}

export async function getConsultations(): Promise<Consultation[]> {
  const response = await api.get<Consultation[]>('/consultations')
  return response.data
}

export async function setConsultationStatus(id: string, status: ConsultationStatus): Promise<Consultation> {
  const response = await api.put<Consultation>(`/consultations/${id}`, { status })
  return response.data
}
