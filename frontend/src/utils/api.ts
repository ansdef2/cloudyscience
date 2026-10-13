// Утилита для работы с API
// Бэкенд живёт в этом же репозитории, в server/

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Единый ключ хранения JWT: его же пишет useAuth при входе
export const AUTH_TOKEN_KEY = 'token'

/**
 * «Запомнить меня» — токен в localStorage и переживает закрытие браузера.
 * Без галочки — в sessionStorage, и вход забывается вместе с вкладкой.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string, remember: boolean) {
  try {
    clearAuthToken()
    ;(remember ? localStorage : sessionStorage).setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Хранилище недоступно (приватный режим) — вход проживёт до перезагрузки
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Нечего чистить
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    // Обработка 401 (Unauthorized)
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        clearAuthToken()
      }
      throw new ApiError('Требуется авторизация', 401)
    }

    // Обработка пустого ответа (204 No Content)
    if (response.status === 204) {
      return { data: null as T }
    }

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Произошла ошибка при запросе',
        response.status,
        data
      )
    }

    return { data }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Ошибка сети', 0, error)
  }
}

// Методы для различных типов запросов
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
