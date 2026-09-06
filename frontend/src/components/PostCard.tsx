'use client'

import { useState } from 'react'
import ImageWithFallback from './ImageWithFallback'
import { Post, likePost } from '@/services/postService'
import { useToast } from '@/hooks/useToast'
import styles from './PostCard.module.css'

/** «Сегодня в 14:48» / «12 июня в 09:30» — как в макете */
function formatPublishedAt(value: string): string {
  const date = new Date(value)
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const isToday = new Date().toDateString() === date.toDateString()

  if (isToday) {
    return `Сегодня в ${time}`
  }

  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в ${time}`
}

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes)
  const [isLiking, setIsLiking] = useState(false)
  const toast = useToast()

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
    const url = `${window.location.origin}/?post=${post.id}`

    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url })
        return
      } catch {
        // Пользователь закрыл системный диалог — тихо уходим в копирование
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  return (
    <article className={styles.card}>
      <div className={`${styles.glow} protoGlowSoft`} />

      <ImageWithFallback
        src={post.author?.avatar ?? ''}
        alt={post.author?.name ?? 'Автор'}
        className={styles.avatar}
        bare
      />
      <p className={styles.author}>{post.author?.name}</p>

      <ImageWithFallback
        src={post.image ?? ''}
        alt={post.title}
        className={styles.cover}
        fallbackText={post.title}
      />

      <p className={styles.date}>{formatPublishedAt(post.publishedAt)}</p>
      <h2 className={styles.title}>{post.title}</h2>
      <p className={styles.text}>{post.text}</p>

      <button className={`${styles.likes} protoPill`} onClick={handleLike} disabled={isLiking}>
        {likes} 👍
      </button>

      <button className={`${styles.share} protoPill`} onClick={handleShare}>
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
    </article>
  )
}
