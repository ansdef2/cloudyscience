// Сервис для поиска
// Интеграция с бэкенд API

import { api } from '@/utils/api'

export type SearchType = 'address' | 'specialists' | 'services' | 'equipment' | 'all'

export interface SearchParams {
  query: string
  type?: SearchType
  filters?: {
    status?: 'open' | 'closed'
    distance?: number
    [key: string]: any
  }
}

export interface SearchResult {
  id: string
  type: 'equipment' | 'institution' | 'specialist' | 'course'
  name: string
  address?: string
  hours?: string
  status?: 'open' | 'closed'
  distance?: string
  avatar?: string
}

/**
 * Выполнить поиск
 */
export async function search(params: SearchParams): Promise<SearchResult[]> {
  try {
    const queryParams = new URLSearchParams({
      q: params.query,
    })
    
    if (params.type && params.type !== 'all') {
      queryParams.append('type', params.type)
    }
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(`filter[${key}]`, String(value))
        }
      })
    }
    
    const response = await api.get<SearchResult[]>(`/search?${queryParams}`)
    return response.data
  } catch (error) {
    console.error('Ошибка поиска:', error)
    return []
  }
}

/**
 * Получить популярные поисковые запросы
 */
export async function getPopularSearches(): Promise<string[]> {
  try {
    const response = await api.get<string[]>('/search/popular')
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки популярных запросов:', error)
    return []
  }
}
