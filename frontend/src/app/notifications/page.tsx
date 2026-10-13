import type { Metadata } from 'next'
import NotificationsPage from '@/screens/NotificationsPage'

export const metadata: Metadata = { title: 'Уведомления — Облако науки', robots: { index: false } }

export default function Notifications() {
  return <NotificationsPage />
}
