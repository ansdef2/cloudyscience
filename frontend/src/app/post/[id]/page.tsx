import type { Metadata } from 'next'
import PostDetail from '@/screens/PostDetail'
import { API_URL, SITE_URL } from '@/utils/site'

interface PostPreview {
  title: string
  text?: string
  image?: string
}

async function loadPost(id: string): Promise<PostPreview | null> {
  try {
    const response = await fetch(`${API_URL}/posts/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    })
    return response.ok ? ((await response.json()) as PostPreview) : null
  } catch {
    // API недоступен — страница всё равно откроется, просто без превью
    return null
  }
}

/** Превью ссылки в мессенджерах и соцсетях: заголовок, начало текста, обложка */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await loadPost(id)
  if (!post) return { title: 'Публикация · Облако науки' }

  const description = String(post.text ?? '').slice(0, 200)
  const image = post.image ? new URL(post.image, SITE_URL).toString() : undefined

  return {
    title: `${post.title} · Облако науки`,
    description,
    openGraph: {
      type: 'article',
      siteName: 'Облако науки',
      locale: 'ru_RU',
      url: `${SITE_URL}/post/${id}`,
      title: post.title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <PostDetail postId={id} />
}
