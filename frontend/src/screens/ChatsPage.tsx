'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import AuthGate from '@/components/AuthGate'
import { ChatSummary, getChats } from '@/services/chatService'
import { useRealtime } from '@/hooks/useRealtime'
import ui from '@/styles/ui.module.css'
import styles from './Chats.module.css'

const REFRESH_MS = 10_000

export const formatChatTime = (iso: string) => {
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** Все переписки: личные и командные, свежие сверху */
export default function ChatsPage() {
  return (
    <div className={`${ui.page} protoPage`}>
      <ProtoTopBar />

      <div className={ui.content}>
        <h1 className={ui.title}>Чаты</h1>
        <AuthGate reason="Войдите, чтобы переписываться с обучающимися и командой">
          {() => <ChatList />}
        </AuthGate>
      </div>

      <BottomNav />
    </div>
  )
}

function ChatList() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatSummary[] | null>(null)

  // Новое сообщение в любом чате — список пересобирается сразу
  useRealtime((event) => {
    if (event.type === 'message') {
      getChats()
        .then(setChats)
        .catch(() => undefined)
    }
  })

  useEffect(() => {
    let cancelled = false
    const load = () =>
      getChats()
        .then((items) => !cancelled && setChats(items))
        .catch(() => !cancelled && setChats((current) => current ?? []))
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  if (chats === null) return <div className="bigLoader" />

  if (chats.length === 0) {
    return (
      <div className={ui.empty}>
        <p style={{ marginBottom: 14 }}>
          Чатов пока нет. Найдите собеседника среди обучающихся или создайте команду — у неё будет общий чат.
        </p>
        <button className={ui.primary} onClick={() => router.push('/people?tab=learners')}>
          Найти людей
        </button>
      </div>
    )
  }

  return (
    <div className={ui.list}>
      {chats.map((chat) => (
        <div
          key={`${chat.kind}-${chat.id}`}
          className={`${ui.card} ${ui.cardLink}`}
          role="link"
          tabIndex={0}
          onClick={() => router.push(`/chats/${chat.kind}/${chat.id}`)}
          onKeyDown={(event) => event.key === 'Enter' && router.push(`/chats/${chat.kind}/${chat.id}`)}
        >
          {chat.kind === 'team' ? (
            <span className={styles.teamAvatar} aria-hidden>
              {chat.title.charAt(0).toUpperCase()}
            </span>
          ) : (
            <Avatar name={chat.title} src={chat.avatar} size={44} />
          )}

          <div className={ui.cardBody}>
            <span className={ui.cardTitle}>
              {chat.title}
              {chat.kind === 'team' && <span className={`${ui.badge} ${styles.kind}`}>команда</span>}
            </span>
            <span className={`${ui.cardMeta} ${styles.preview}`}>{chat.lastMessage}</span>
          </div>

          <div className={styles.side}>
            <span className={styles.time}>{formatChatTime(chat.lastAt)}</span>
            {chat.unread > 0 && <span className={styles.unread}>{chat.unread}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
