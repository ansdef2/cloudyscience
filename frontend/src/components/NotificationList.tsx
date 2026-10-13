'use client'

import { useRouter } from 'next/navigation'
import { AppNotification } from '@/services/notificationService'
import styles from './NotificationList.module.css'

interface NotificationListProps {
  items: AppNotification[] | null
  onOpen: (item: AppNotification) => void
  /** Компактный вид — для выпадающей панели в шапке */
  compact?: boolean
}

const when = (iso: string) => {
  const date = new Date(iso)
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Список уведомлений: непрочитанные — с точкой, нажатие ведёт по ссылке */
export default function NotificationList({ items, onOpen, compact = false }: NotificationListProps) {
  const router = useRouter()

  if (items === null) return <div className="bigLoader" />
  if (!items.length) return <p className={styles.empty}>Уведомлений пока нет</p>

  return (
    <ul className={`${styles.list} ${compact ? styles.compact : ''}`}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            className={`${styles.item} ${item.readAt ? '' : styles.unread}`}
            onClick={() => {
              onOpen(item)
              if (item.link) router.push(item.link)
            }}
          >
            <span className={styles.title}>{item.title}</span>
            {item.body && <span className={styles.body}>{item.body}</span>}
            <time className={styles.time} dateTime={item.createdAt}>
              {when(item.createdAt)}
            </time>
          </button>
        </li>
      ))}
    </ul>
  )
}
