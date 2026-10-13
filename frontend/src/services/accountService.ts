// Свой аккаунт: имя, пароль, аватар, согласия, удаление
// Сервер — server/src/routes/users.ts и routes/auth.ts

import { User } from '@/models/Api'
import { api, getAuthToken, setAuthToken } from '@/utils/api'

/** Новый токен кладём туда же, где лежал старый: в localStorage или sessionStorage */
function replaceToken(token: string) {
  let remembered = true
  try {
    remembered = !!localStorage.getItem('token') || !sessionStorage.getItem('token')
  } catch {
    // Хранилище недоступно — оставим как «запомнить»
  }
  if (getAuthToken()) setAuthToken(token, remembered)
}

export async function updateName(name: string) {
  return (await api.put<User>('/users/me', { name })).data
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.put<{ token: string }>('/users/me/password', { currentPassword, newPassword })
  replaceToken(data.token)
}

export async function logoutEverywhere() {
  const { data } = await api.post<{ token: string }>('/users/me/logout-all')
  replaceToken(data.token)
}

export async function removeAvatar() {
  return (await api.delete<User>('/users/me/avatar')).data
}

export async function acceptPolicy() {
  return (await api.post<User>('/auth/consent')).data
}

export async function resendParentConsent() {
  return (await api.post<{ sent: boolean; mailConfigured: boolean }>('/auth/parent-consent/resend')).data
}

export async function deleteMyAccount(password: string) {
  await api.delete('/users/me', { body: JSON.stringify({ password }) })
}
