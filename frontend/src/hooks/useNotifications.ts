import { useCallback, useEffect, useState } from 'react'
import {
  AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService'
import { useRealtime } from './useRealtime'

const REFRESH_MS = 60_000

/**
 * Уведомления пользователя: загрузка, живые новые по сокету и
 * редкий опрос на случай, если сокет недоступен.
 */
export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [unread, setUnread] = useState(0)

  const load = useCallback(() => {
    getNotifications()
      .then((data) => {
        setItems(data.items)
        setUnread(data.unread)
      })
      .catch(() => setItems((current) => current ?? []))
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [enabled, load])

  useRealtime((event) => {
    if (event.type !== 'notification') return
    setItems((current) => [event.notification, ...(current ?? []).filter((item) => item.id !== event.notification.id)])
    setUnread((count) => count + 1)
  }, enabled)

  const markRead = useCallback((item: AppNotification) => {
    if (item.readAt) return
    setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)) ?? null)
    setUnread((count) => Math.max(0, count - 1))
    markNotificationRead(item.id).catch(() => undefined)
  }, [])

  const markAll = useCallback(() => {
    setItems((current) => current?.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })) ?? null)
    setUnread(0)
    markAllNotificationsRead().catch(() => undefined)
  }, [])

  return { items, unread, markRead, markAll, reload: load }
}
