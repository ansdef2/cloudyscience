'use client'

import ImageWithFallback from './ImageWithFallback'
import { Post } from '@/services/postService'
import styles from './HighlightCard.module.css'

/** Карточка карусели «Актуальное» — крупное фото с подписью автора */
interface HighlightCardProps {
  post: Post
  onClick?: () => void
}

export default function HighlightCard({ post, onClick }: HighlightCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
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
