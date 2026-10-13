'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageWithFallback from './ImageWithFallback'
import { Post, likePost } from '@/services/postService'
import { useToast } from '@/hooks/useToast'
import { formatPublishedAt } from '@/utils/format'
import { postPath, shareLink } from '@/utils/share'
import styles from './PostCard.module.css'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes)
  const [isLiking, setIsLiking] = useState(false)
  const toast = useToast()
  const router = useRouter()

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    const updated = await likePost(post.id)
    setIsLiking(false)

    if (updated !== null) {
      setLikes(updated)
    }
  }

  const handleShare = async () => {
    const result = await shareLink(post.title, postPath(post.id))
    if (result === 'copied') toast.success('Ссылка на публикацию скопирована')
    if (result === 'failed') toast.error('Не удалось скопировать ссылку')
  }

  const open = () => router.push(postPath(post.id))

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      aria-label={`Открыть публикацию «${post.title}»`}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open()
      }}
    >
      <div className={`${styles.glow} protoGlowSoft`} />

      <div className={styles.head}>
        <ImageWithFallback
          src={post.author?.avatar ?? ''}
          alt={post.author?.name ?? 'Автор'}
          className={styles.avatar}
          bare
        />
        <p className={styles.author}>{post.author?.name}</p>
      </div>

      <ImageWithFallback
        src={post.image ?? ''}
        alt={post.title}
        className={styles.cover}
        fallbackText={post.title}
      />

      <div className={styles.body}>
        <p className={styles.date}>{formatPublishedAt(post.publishedAt)}</p>
        <h2 className={styles.title}>{post.title}</h2>
        <p className={styles.text}>{post.text}</p>
      </div>

      <div className={styles.footer}>
        <button
          className="protoPill"
          onClick={(event) => {
            event.stopPropagation()
            handleLike()
          }}
          disabled={isLiking}
        >
          {likes} 👍
        </button>

        <button
          className={`${styles.share} protoPill`}
          onClick={(event) => {
            event.stopPropagation()
            handleShare()
          }}
        >
          Поделиться
          <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  )
}
