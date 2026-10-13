'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getUnreadCount } from '@/services/chatService'
import { getAuthToken } from '@/utils/api'
import { useRealtime } from '@/hooks/useRealtime'
import styles from './SiteHeader.module.css'

const REFRESH_MS = 30_000

/** Значок чатов в шапке с числом непрочитанных; гостю не показывается */
export default function ChatsLink({ active }: { active: boolean }) {
  const [unread, setUnread] = useState<number | null>(null)

  // Пришло личное сообщение — пересчитать непрочитанные сразу, не дожидаясь опроса
  useRealtime(
    (event) => {
      if (event.type === 'message' && event.kind === 'user') {
        getUnreadCount()
          .then(setUnread)
          .catch(() => undefined)
      }
    },
    unread !== null
  )

  useEffect(() => {
    if (!getAuthToken()) return
    let cancelled = false
    const load = () =>
      getUnreadCount()
        .then((count) => !cancelled && setUnread(count))
        .catch(() => undefined)
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  if (unread === null) return null

  return (
    <Link
      href="/chats"
      className={`${styles.chats} ${active ? styles.chatsActive : ''}`}
      aria-label={unread ? `Чаты, непрочитанных: ${unread}` : 'Чаты'}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
    </Link>
  )
}
