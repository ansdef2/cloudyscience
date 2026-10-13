// Живые обновления по WebSocket: новые сообщения и уведомления.
// Одно соединение на вкладку; страницы подписываются через useRealtime.
// Пока сокета нет (сервер недоступен, прокси режет), страницы опрашивают API как раньше.

import { API_BASE_URL, getAuthToken } from '@/utils/api'

export type RealtimeEvent =
  | { type: 'ready' }
  | { type: 'notification'; notification: AppNotification }
  | { type: 'message'; kind: 'user' | 'team'; chatId: string; message: RealtimeMessage }

export interface AppNotification {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  readAt?: string | null
  createdAt: string
}

export interface RealtimeMessage {
  id: string
  senderId: string
  recipientId?: string | null
  teamId?: string | null
  text: string
  createdAt: string
  sender?: { id: string; name: string; avatar?: string | null }
}

type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()
const statusListeners = new Set<(connected: boolean) => void>()
let socket: WebSocket | null = null
let connected = false
let retry = 0
let retryTimer: number | undefined
let stopped = false

const wsUrl = () => {
  const base = API_BASE_URL.startsWith('http')
    ? API_BASE_URL
    : `${window.location.origin}${API_BASE_URL.startsWith('/') ? '' : '/'}${API_BASE_URL}`
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'
}

const setConnected = (value: boolean) => {
  if (connected === value) return
  connected = value
  statusListeners.forEach((listener) => listener(value))
}

function connect() {
  if (typeof window === 'undefined' || socket || stopped) return
  const token = getAuthToken()
  if (!token) return

  try {
    socket = new WebSocket(wsUrl())
  } catch {
    socket = null
    return
  }

  socket.onopen = () => socket?.send(JSON.stringify({ type: 'auth', token }))
  socket.onmessage = (raw) => {
    let event: RealtimeEvent
    try {
      event = JSON.parse(String(raw.data))
    } catch {
      return
    }
    if (event.type === 'ready') {
      retry = 0
      setConnected(true)
    }
    listeners.forEach((listener) => listener(event))
  }
  socket.onclose = (close) => {
    socket = null
    setConnected(false)
    // 4001 — токен не принят: переподключаться бессмысленно до нового входа
    if (close.code === 4001 || !listeners.size) return
    const delay = Math.min(30_000, 1000 * 2 ** retry++)
    retryTimer = window.setTimeout(connect, delay)
  }
  socket.onerror = () => socket?.close()
}

/** Подписаться на события; возвращает отписку */
export function subscribe(listener: Listener) {
  listeners.add(listener)
  stopped = false
  connect()
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.clearTimeout(retryTimer)
      socket?.close()
      socket = null
    }
  }
}

export function onConnectionChange(listener: (connected: boolean) => void) {
  statusListeners.add(listener)
  listener(connected)
  return () => {
    statusListeners.delete(listener)
  }
}

/** После выхода из аккаунта — закрыть соединение */
export function disconnectRealtime() {
  stopped = true
  window.clearTimeout(retryTimer)
  socket?.close()
  socket = null
}
