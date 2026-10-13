import type { MetadataRoute } from 'next'
import { API_URL, SITE_URL } from '@/utils/site'

// Пересобирается раз в час: новые курсы и оборудование попадают в карту сами
export const revalidate = 3600

const load = async <T,>(path: string): Promise<T[]> => {
  try {
    const response = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(5000) })
    return response.ok ? ((await response.json()) as T[]) : []
  } catch {
    // API недоступен (например, во время сборки образа) — только статические страницы
    return []
  }
}

type Item = { id: string; updatedAt?: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [institutions, equipment, courses, posts] = await Promise.all([
    load<Item>('/institutions'),
    load<Item>('/equipment'),
    load<Item>('/courses'),
    load<Item>('/posts'),
  ])

  const page = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
  })

  return [
    page('/', 1),
    page('/home', 0.9),
    page('/equipment', 0.9),
    page('/courses', 0.9),
    page('/people', 0.6),
    page('/privacy', 0.2),
    page('/terms', 0.2),
    ...institutions.map((item) => page(`/institution/${item.id}`, 0.7, item.updatedAt)),
    ...equipment.map((item) => page(`/equipment/${item.id}`, 0.8, item.updatedAt)),
    ...courses.map((item) => page(`/course/${item.id}`, 0.8, item.updatedAt)),
    ...posts.map((item) => page(`/post/${item.id}`, 0.5, item.updatedAt)),
  ]
}
