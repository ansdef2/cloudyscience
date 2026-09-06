# Интеграция с бэкендом

Фронтенд и бэкенд живут в одном репозитории: API находится в каталоге `server/`.
Этот документ описывает, как связать их между собой.

## 📋 Предварительные требования

1. **Бэкенд репозиторий** должен быть запущен
2. **PostgreSQL** база данных должна быть настроена
3. **Backend API** должен быть доступен (по умолчанию `http://localhost:3001/api`)

## 🔧 Настройка

### 1. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
# URL бэкенд API
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Для продакшена укажите реальный URL
# NEXT_PUBLIC_API_URL=https://api.cloudco.ru/api
```

### 2. Запуск бэкенда

Из корня этого же репозитория:

```bash
cd server

# Установите зависимости
npm install

# Настройте базу данных
cp .env.example .env
# Отредактируйте .env с настройками PostgreSQL

# Залейте демо-данные (пересоздаёт таблицы)
npm run db:seed

# Запустите сервер
npm run dev
```

Backend API будет доступен на `http://localhost:3001/api`

## 🔌 API клиент

API клиент уже настроен в `src/utils/api.ts`. Он предоставляет следующие методы:

```typescript
import { api } from '@/utils/api'

// GET запрос
const equipment = await api.get<Equipment[]>('/equipment')

// POST запрос
const booking = await api.post<Booking>('/bookings', {
  equipmentId: '1',
  startTime: '2025-01-20T10:00:00Z',
  files: ['file1.gcode']
})

// PUT запрос
await api.put<Equipment>(`/equipment/${id}`, { status: 'maintenance' })

// DELETE запрос
await api.delete(`/bookings/${id}`)
```

## 📡 Примеры интеграции

### Получение списка оборудования

```typescript
// src/services/equipmentService.ts
import { api } from '@/utils/api'

export interface Equipment {
  id: string
  name: string
  type: string
  address: string
  hours: string
  status: 'open' | 'closed'
  // ... другие поля
}

export async function getEquipmentList(): Promise<Equipment[]> {
  try {
    const response = await api.get<Equipment[]>('/equipment')
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки оборудования:', error)
    throw error
  }
}

export async function getEquipmentById(id: string): Promise<Equipment> {
  try {
    const response = await api.get<Equipment>(`/equipment/${id}`)
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки оборудования:', error)
    throw error
  }
}
```

### Создание бронирования

```typescript
// src/services/bookingService.ts
import { api } from '@/utils/api'

export interface BookingRequest {
  equipmentId: string
  startTime: string
  endTime?: string
  rentalType: 'remote' | 'in-person'
  files?: string[]
}

export interface Booking {
  id: string
  equipmentId: string
  userId: string
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'active' | 'completed'
  // ... другие поля
}

export async function createBooking(data: BookingRequest): Promise<Booking> {
  try {
    const response = await api.post<Booking>('/bookings', data)
    return response.data
  } catch (error) {
    console.error('Ошибка создания бронирования:', error)
    throw error
  }
}
```

### Работа с файлами

```typescript
// src/services/fileService.ts
import { api } from '@/utils/api'

export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  // ... другие поля
}

export async function getFiles(): Promise<FileInfo[]> {
  try {
    const response = await api.get<FileInfo[]>('/files')
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки файлов:', error)
    throw error
  }
}

export async function uploadFile(file: File): Promise<FileInfo> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`, // если требуется авторизация
      },
    })
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки файла')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Ошибка загрузки файла:', error)
    throw error
  }
}
```

### Поиск

```typescript
// src/services/searchService.ts
import { api } from '@/utils/api'

export interface SearchParams {
  query: string
  type?: 'address' | 'specialists' | 'services' | 'equipment'
  filters?: Record<string, any>
}

export interface SearchResult {
  id: string
  type: 'equipment' | 'institution' | 'specialist'
  name: string
  address?: string
  // ... другие поля
}

export async function search(params: SearchParams): Promise<SearchResult[]> {
  try {
    const queryParams = new URLSearchParams({
      q: params.query,
      ...(params.type && { type: params.type }),
    })
    
    const response = await api.get<SearchResult[]>(`/search?${queryParams}`)
    return response.data
  } catch (error) {
    console.error('Ошибка поиска:', error)
    throw error
  }
}
```

## 🔐 Аутентификация

### Настройка авторизации

```typescript
// src/utils/auth.ts
import { storage } from './storage'

const AUTH_TOKEN_KEY = 'auth_token'

export function setAuthToken(token: string): void {
  storage.local.set(AUTH_TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  return storage.local.get<string>(AUTH_TOKEN_KEY)
}

export function removeAuthToken(): void {
  storage.local.remove(AUTH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}
```

### Обновление API клиента для авторизации

```typescript
// src/utils/api.ts - обновленная версия
import { getAuthToken } from './auth'

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
      removeAuthToken()
      window.location.href = '/login'
      throw new ApiError('Требуется авторизация', 401)
    }

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Произошла ошибка при запросе',
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
```

### Примеры использования авторизации

```typescript
// src/services/authService.ts
import { api } from '@/utils/api'
import { setAuthToken, removeAuthToken } from '@/utils/auth'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
  }
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    setAuthToken(response.data.token)
    return response.data
  } catch (error) {
    console.error('Ошибка входа:', error)
    throw error
  }
}

export async function logout(): Promise<void> {
  removeAuthToken()
  // Опционально: вызвать API endpoint для logout
  // await api.post('/auth/logout')
}
```

## 🔄 Замена hardcoded данных на API

### Пример: EquipmentCatalog

**Было (hardcoded):**
```typescript
const equipmentItems = [
  { id: '1', name: 'Oculus Rift CV1', ... },
  { id: '2', name: 'Milling Machine', ... },
]
```

**Стало (с API):**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { getEquipmentList } from '@/services/equipmentService'
import EquipmentCard from '@/components/EquipmentCard'

export default function EquipmentCatalog() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadEquipment() {
      try {
        setLoading(true)
        const data = await getEquipmentList()
        setEquipment(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadEquipment()
  }, [])

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>Ошибка: {error}</div>

  return (
    <div>
      {equipment.map(item => (
        <EquipmentCard key={item.id} equipment={item} />
      ))}
    </div>
  )
}
```

## 📝 Ожидаемые API endpoints

На основе структуры бэкенда, ожидаются следующие endpoints:

### Оборудование
- `GET /api/equipment` - список оборудования
- `GET /api/equipment/:id` - детали оборудования
- `GET /api/equipment/:id/availability` - доступность оборудования

### Бронирования
- `POST /api/bookings` - создание бронирования
- `GET /api/bookings` - список бронирований пользователя
- `GET /api/bookings/:id` - детали бронирования
- `PUT /api/bookings/:id` - обновление бронирования
- `DELETE /api/bookings/:id` - отмена бронирования

### Файлы
- `GET /api/files` - список файлов
- `POST /api/files/upload` - загрузка файла
- `GET /api/files/:id` - скачивание файла
- `DELETE /api/files/:id` - удаление файла

### Поиск
- `GET /api/search?q=query&type=equipment` - поиск

### Учреждения
- `GET /api/institutions` - список учреждений
- `GET /api/institutions/:id` - детали учреждения
- `GET /api/institutions/:id/courses` - курсы учреждения

### Курсы
- `GET /api/courses` - список курсов
- `GET /api/courses/:id` - детали курса
- `POST /api/courses/:id/book` - запись на курс

### Аутентификация
- `POST /api/auth/login` - вход
- `POST /api/auth/register` - регистрация
- `POST /api/auth/logout` - выход
- `GET /api/auth/me` - текущий пользователь

## 🧪 Тестирование интеграции

### Проверка подключения

```typescript
// src/utils/testConnection.ts
import { api } from './api'

export async function testBackendConnection(): Promise<boolean> {
  try {
    await api.get('/health') // или другой endpoint для проверки
    return true
  } catch (error) {
    console.error('Backend недоступен:', error)
    return false
  }
}
```

## 🐛 Обработка ошибок

API клиент автоматически обрабатывает ошибки. Для дополнительной обработки:

```typescript
import { ApiError } from '@/utils/api'

try {
  const data = await api.get('/equipment')
} catch (error) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) {
      // Обработка 404
    } else if (error.statusCode === 500) {
      // Обработка 500
    }
  }
}
```

## 📚 Дополнительные ресурсы

- [Документация бэкенд API](https://github.com/ansdef/cloudco) - проверьте README бэкенд репозитория
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) - если нужны proxy endpoints
