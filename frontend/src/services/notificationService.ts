// Уведомления: колокольчик в шапке и страница /notifications
// API: server/src/routes/notifications.ts

import { api } from '@/utils/api'
import { AppNotification } from '@/utils/realtime'

export type { AppNotification }

export async function getNotifications() {
  return (await api.get<{ items: AppNotification[]; unread: number }>('/notifications')).data
}

export async function markNotificationRead(id: string) {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all')
}
