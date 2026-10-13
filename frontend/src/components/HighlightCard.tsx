'use client'

import { useRouter } from 'next/navigation'
import ImageWithFallback from './ImageWithFallback'
import { Post } from '@/services/postService'
import { postPath } from '@/utils/share'
import styles from './HighlightCard.module.css'

/** Карточка карусели «Актуальное» — крупное фото с подписью автора */
interface HighlightCardProps {
  post: Post
  onClick?: () => void
}

export default function HighlightCard({ post, onClick }: HighlightCardProps) {
  const router = useRouter()
  // По тапу история открывается целиком — с текстом и кнопкой «Поделиться»
  const open = onClick ?? (() => router.push(postPath(post.id)))

  return (
    <div
      className={styles.card}
      role="link"
      tabIndex={0}
      aria-label={`Открыть «${post.title}»`}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open()
      }}
    >
      <ImageWithFallback
        src={post.image ?? ''}
        alt={post.title}
        className={styles.image}
        fallbackText={post.author?.name ?? post.title}
      />

      <div className={styles.author}>
        <ImageWithFallback
          src={post.author?.avatar ?? ''}
          alt={post.author?.name ?? 'Автор'}
          className={styles.avatar}
          bare
        />
        <span className={styles.name}>{post.author?.name}</span>
      </div>
    </div>
  )
}
