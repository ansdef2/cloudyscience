'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import Avatar from '@/components/Avatar'
import AuthGate from '@/components/AuthGate'
import { User } from '@/models/Api'
import {
  ChatMessage,
  getDirectMessages,
  getTeamMessages,
  sendDirectMessage,
  sendTeamMessage,
} from '@/services/chatService'
import { getTeam } from '@/services/teamService'
import { useToast } from '@/hooks/useToast'
import { ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from './Chats.module.css'

const POLL_MS = 4000

interface ChatRoomProps {
  kind: 'user' | 'team'
  id: string
}

/** Переписка: личная (kind=user) или чат команды (kind=team) */
export default function ChatRoom({ kind, id }: ChatRoomProps) {
  return (
    <div className={`${ui.page} ${styles.roomPage} protoPage`}>
      <ProtoTopBar />
      <AuthGate reason="Войдите, чтобы читать и писать сообщения">
        {(user) => <Room kind={kind} id={id} me={user} />}
      </AuthGate>
    </div>
  )
}

function Room({ kind, id, me }: ChatRoomProps & { me: User }) {
  const router = useRouter()
  const toast = useToast()
  const [title, setTitle] = useState<string>('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const lastAtRef = useRef<string | undefined>(undefined)

  /** Добавить новые сообщения без дублей — опрос и отправка могут прислать одно и то же */
  const append = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return
    setMessages((current) => {
      const known = new Set((current ?? []).map((message) => message.id))
      const merged = [...(current ?? []), ...incoming.filter((message) => !known.has(message.id))]
      lastAtRef.current = merged[merged.length - 1]?.createdAt
      return merged
    })
  }, [])

  const load = useCallback(
    async (initial: boolean) => {
      try {
        const since = initial ? undefined : lastAtRef.current
        if (kind === 'user') {
          const data = await getDirectMessages(id, since)
          if (initial) {
            setTitle(data.peer.name)
            setAvatar(data.peer.avatar ?? null)
            setMessages([])
          }
          append(data.messages)
        } else {
          if (initial) {
            const team = await getTeam(id)
            setTitle(team.name)
            setMessages([])
          }
          append(await getTeamMessages(id, since))
        }
      } catch (loadError) {
        if (initial) setError(loadError instanceof ApiError ? loadError.message : 'Чат недоступен')
      }
    },
    [kind, id, append]
  )

  useEffect(() => {
    lastAtRef.current = undefined
    setMessages(null)
    load(true)
    const timer = window.setInterval(() => load(false), POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Новое сообщение — прокрутка вниз
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages?.length])

  const send = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault()
    const value = text.trim()
    if (!value || sending) return

    setSending(true)
    try {
      const message =
        kind === 'user' ? await sendDirectMessage(id, value) : await sendTeamMessage(id, value)
      append([{ ...message, sender: message.sender ?? { id: me.id, name: me.name } }])
      setText('')
    } catch (sendError) {
      toast.error(sendError instanceof ApiError ? sendError.message : 'Не удалось отправить')
    } finally {
      setSending(false)
    }
  }

  if (error) return <div className={`${ui.empty} ${styles.roomError}`}>{error}</div>

  return (
    <div className={styles.room}>
      <header className={styles.roomHead}>
        {kind === 'team' ? (
          <span className={styles.teamAvatar} aria-hidden>
            {title.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Avatar name={title || '?'} src={avatar} size={40} />
        )}
        <div className={ui.cardBody}>
          <span className={ui.cardTitle}>{title || '…'}</span>
          <span className={ui.cardMeta}>{kind === 'team' ? 'Чат команды' : 'Личные сообщения'}</span>
        </div>
        {kind === 'team' && (
          <button className={`${ui.ghost} ${ui.small}`} onClick={() => router.push(`/teams/${id}`)}>
            О команде
          </button>
        )}
      </header>

      <div className={styles.messages} ref={listRef} aria-live="polite">
        {messages === null ? (
          <div className="bigLoader" />
        ) : messages.length === 0 ? (
          <p className={styles.noMessages}>Сообщений пока нет — напишите первым</p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === me.id
            return (
              <div key={message.id} className={`${styles.bubbleRow} ${mine ? styles.mine : ''}`}>
                <div className={styles.bubble}>
                  {kind === 'team' && !mine && <span className={styles.sender}>{message.sender?.name}</span>}
                  <span className={styles.bubbleText}>{message.text}</span>
                  <time className={styles.bubbleTime} dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </div>
            )
          })
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        <textarea
          className={`${ui.textarea} ${styles.composerInput}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter — отправить, Shift+Enter — новая строка
            if (event.key === 'Enter' && !event.shiftKey) send(event)
          }}
          placeholder="Сообщение"
          rows={1}
          maxLength={2000}
          aria-label="Сообщение"
        />
        <button
          className={`${ui.primary} ${styles.send}`}
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Отправить"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  )
}
