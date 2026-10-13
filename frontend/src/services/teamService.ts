// Исследовательские команды: участники, общий чат, брони
// API: server/src/routes/teams.ts

import { api } from '@/utils/api'

export interface TeamMember {
  userId: string
  role: 'owner' | 'member'
  User?: { id: string; name: string; avatar?: string | null }
}

export interface Team {
  id: string
  name: string
  /** Тема исследования */
  description?: string | null
  ownerId: string
  createdAt: string
  members?: TeamMember[]
  myRole?: 'owner' | 'member' | null
}

export async function getMyTeams(): Promise<Team[]> {
  const response = await api.get<Team[]>('/teams')
  return response.data
}

export async function createTeam(data: { name: string; description?: string }): Promise<Team> {
  const response = await api.post<Team>('/teams', data)
  return response.data
}

export async function getTeam(id: string): Promise<Team> {
  const response = await api.get<Team>(`/teams/${id}`)
  return response.data
}

export async function updateTeam(id: string, data: { name?: string; description?: string }): Promise<Team> {
  const response = await api.put<Team>(`/teams/${id}`, data)
  return response.data
}

export async function deleteTeam(id: string): Promise<void> {
  await api.delete(`/teams/${id}`)
}

export interface TeamInvitation {
  id: string
  teamId: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  createdAt: string
  Team?: { id: string; name: string; description?: string | null }
  inviter?: { id: string; name: string; avatar?: string | null }
  invitee?: { id: string; name: string; avatar?: string | null }
}

/** Пригласить в команду: человек попадёт в неё, когда примет приглашение */
export async function inviteToTeam(teamId: string, userId: string) {
  return (await api.post<TeamInvitation>(`/teams/${teamId}/invitations`, { userId })).data
}

/** Мои входящие приглашения */
export async function getMyInvitations() {
  return (await api.get<TeamInvitation[]>('/teams/invitations')).data
}

export async function respondInvitation(id: string, accept: boolean) {
  return (await api.post<{ status: string; teamId: string }>(`/teams/invitations/${id}/${accept ? 'accept' : 'decline'}`))
    .data
}

/** Ожидающие приглашения команды — для её создателя */
export async function getTeamInvitations(teamId: string) {
  return (await api.get<TeamInvitation[]>(`/teams/${teamId}/invitations`)).data
}

export async function cancelInvitation(teamId: string, invitationId: string) {
  await api.delete(`/teams/${teamId}/invitations/${invitationId}`)
}

/** Убрать участника или выйти самому */
export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  await api.delete(`/teams/${teamId}/members/${userId}`)
}
