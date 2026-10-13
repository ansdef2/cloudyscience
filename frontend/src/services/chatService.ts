// Чаты: личные переписки и командные
// API: server/src/routes/chats.ts, teams.ts

import { api } from '@/utils/api'

export interface ChatSummary {
  kind: 'user' | 'team'
  id: string
  title: string
  avatar: string | null
  lastMessage: string
  lastAt: string
  unread: number
}

export interface ChatMessage {
  id: string
  senderId: string
  text: string
  createdAt: string
  sender?: { id: string; name: string; avatar?: string | null }
}

const after = (since?: string) => (since ? `?after=${encodeURIComponent(since)}` : '')

export async function getChats(): Promise<ChatSummary[]> {
  const response = await api.get<ChatSummary[]>('/chats')
  return response.data
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ unread: number }>('/chats/unread')
  return response.data.unread
}

export async function getDirectMessages(
  userId: string,
  since?: string
): Promise<{
  peer: { id: string; name: string; avatar?: string | null }
  messages: ChatMessage[]
  /** Я заблокировал собеседника */
  blockedByMe?: boolean
  /** Можно ли сейчас писать: нет блокировок, собеседник доступен */
  canWrite?: boolean
}> {
  const response = await api.get<any>(`/chats/users/${userId}/messages${after(since)}`)
  return response.data
}

export async function sendDirectMessage(userId: string, text: string): Promise<ChatMessage> {
  const response = await api.post<ChatMessage>(`/chats/users/${userId}/messages`, { text })
  return response.data
}

export async function getTeamMessages(teamId: string, since?: string): Promise<ChatMessage[]> {
  const response = await api.get<ChatMessage[]>(`/teams/${teamId}/messages${after(since)}`)
  return response.data
}

export async function sendTeamMessage(teamId: string, text: string): Promise<ChatMessage> {
  const response = await api.post<ChatMessage>(`/teams/${teamId}/messages`, { text })
  return response.data
}
