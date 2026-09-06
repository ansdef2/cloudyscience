// Лента на главном экране
// Интеграция с бэкенд API (server/src/routes/posts.ts)

import { api } from '@/utils/api'

export interface PostAuthor {
  id: string
  name: string
  avatar?: string
}

export interface Post {
  id: string
  authorId: string
  author?: PostAuthor
  title: string
  text: string
  image?: string
  likes: number
  isFeatured: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export type PostSort = 'popular' | 'new'

export interface PostFilters {
  search?: string
  sort?: PostSort
  /** true — только карусель «Актуальное», false — только основная лента */
  featured?: boolean
}

export async function getPosts(filters?: PostFilters): Promise<Post[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.sort) params.append('sort', filters.sort)
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured))

    const query = params.toString()
    const response = await api.get<Post[]>(query ? `/posts?${query}` : '/posts')
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки ленты:', error)
    return []
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const response = await api.get<Post>(`/posts/${id}`)
    return response.data
  } catch (error) {
    console.error('Ошибка загрузки поста:', error)
    return null
  }
}

/** Возвращает новое число лайков */
export async function likePost(id: string): Promise<number | null> {
  try {
    const response = await api.post<{ id: string; likes: number }>(`/posts/${id}/like`)
    return response.data.likes
  } catch (error) {
    console.error('Ошибка лайка:', error)
    return null
  }
}
