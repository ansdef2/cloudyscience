// Жалобы и личные блокировки
// API: server/src/routes/safety.ts

import { api } from '@/utils/api'

export const REPORT_REASONS = [
  { id: 'spam', label: 'Спам или реклама' },
  { id: 'insult', label: 'Оскорбления, травля' },
  { id: 'adult', label: 'Неприемлемый контент' },
  { id: 'danger', label: 'Угрозы, опасность для ребёнка' },
  { id: 'fraud', label: 'Мошенничество' },
  { id: 'other', label: 'Другое' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['id']

export async function sendReport(data: { userId?: string; messageId?: string; reason: ReportReason; comment?: string }) {
  return (await api.post<{ message: string }>('/safety/reports', data)).data
}

export async function blockUser(userId: string) {
  await api.post(`/safety/blocks/${userId}`)
}

export async function unblockUser(userId: string) {
  await api.delete(`/safety/blocks/${userId}`)
}

export async function getBlockedUsers() {
  return (await api.get<{ id: string; name: string; avatar?: string | null }[]>('/safety/blocks')).data
}
