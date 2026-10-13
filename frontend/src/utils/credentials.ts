/**
 * Сохранение учётных данных.
 *
 * Пароль сайт у себя не хранит — его хранит менеджер паролей браузера.
 * Там, где есть Credential Management API (Chrome, Edge, Яндекс Браузер),
 * после входа браузер предлагает сохранить пару «почта + пароль», а на
 * странице входа она подставляется сама. Safari и Firefox сохраняют пароль
 * по атрибутам autocomplete формы — для этого API не нужен.
 *
 * Сайт помнит только почту и выбор «Запомнить меня».
 */

const REMEMBERED_EMAIL_KEY = 'rememberedEmail'
const REMEMBER_ME_KEY = 'rememberMe'

interface PasswordCredentialData {
  id: string
  password: string
  name?: string
}

type PasswordCredentialConstructor = new (data: PasswordCredentialData) => Credential

const getPasswordCredential = (): PasswordCredentialConstructor | null => {
  if (typeof window === 'undefined' || !navigator.credentials) return null
  return (window as unknown as { PasswordCredential?: PasswordCredentialConstructor }).PasswordCredential ?? null
}

/** Предложить браузеру сохранить пароль. Молча ничего не делает, если API нет */
export async function saveCredential(email: string, password: string, name?: string) {
  const PasswordCredential = getPasswordCredential()
  if (!PasswordCredential) return

  try {
    await navigator.credentials.store(new PasswordCredential({ id: email, password, name }))
  } catch {
    // Пользователь отказался или браузер запретил — вход от этого не страдает
  }
}

/**
 * Достать сохранённую пару без диалогов. Вернёт её, только если браузер
 * уже разрешил сайту автоматический вход; иначе — null.
 */
export async function loadSavedCredential(): Promise<{ email: string; password: string } | null> {
  if (!getPasswordCredential()) return null

  try {
    const credential = (await navigator.credentials.get({
      password: true,
      mediation: 'silent',
    } as CredentialRequestOptions)) as (Credential & { password?: string }) | null

    if (credential?.type === 'password' && credential.password) {
      return { email: credential.id, password: credential.password }
    }
  } catch {
    // API есть, но запрос отклонён — заполнит автозаполнение браузера
  }

  return null
}

/** После выхода браузер не должен впускать обратно без спроса */
export function preventSilentSignIn() {
  try {
    navigator.credentials?.preventSilentAccess?.()
  } catch {
    // Не поддерживается — ничего страшного
  }
}

export function getRememberedLogin(): { email: string; remember: boolean } {
  try {
    return {
      email: localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '',
      remember: localStorage.getItem(REMEMBER_ME_KEY) !== 'false',
    }
  } catch {
    return { email: '', remember: true }
  }
}

export function setRememberedLogin(email: string, remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, String(remember))
    if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  } catch {
    // Хранилище недоступно — форма просто откроется пустой
  }
}
