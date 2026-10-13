'use client'

import { useEffect, useState } from 'react'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import { getPostById, likePost, Post } from '@/services/postService'
import { useToast } from '@/hooks/useToast'
import { formatPublishedAt } from '@/utils/format'
import { postPath, shareLink } from '@/utils/share'
import styles from './PostDetail.module.css'

/** Публикация целиком: открывается из ленты, «Актуального» и по ссылке «Поделиться» */
export default function PostDetail({ postId }: { postId: string }) {
  const toast = useToast()
  const [post, setPost] = useState<Post | 'loading' | null>('loading')
  const [likes, setLikes] = useState(0)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    getPostById(postId).then((found) => {
      setPost(found)
      setLikes(found?.likes ?? 0)
    })
  }, [postId])

  if (post === 'loading') {
    return (
      <div className={`${styles.container} protoPage`}>
        <ProtoTopBar />
        <div className="bigLoader" style={{ marginTop: 60 }} />
      </div>
    )
  }

  if (!post) {
    return (
      <div className={`${styles.container} protoPage`}>
        <ProtoTopBar />
        <p className={styles.notFound}>Публикация не найдена или удалена</p>
      </div>
    )
  }

  const handleLike = async () => {
    // Один лайк за визит — повторное нажатие ничего не добавляет
    if (liked) return
    setLiked(true)
    const updated = await likePost(post.id)
    if (updated !== null) setLikes(updated)
  }

  const handleShare = async () => {
    const result = await shareLink(post.title, postPath(post.id))
    if (result === 'copied') toast.success('Ссылка на публикацию скопирована')
    if (result === 'failed') toast.error('Не удалось скопировать ссылку')
  }

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />

      <article className={styles.article}>
        <header className={styles.head}>
          <ImageWithFallback
            src={post.author?.avatar ?? ''}
            alt={post.author?.name ?? 'Автор'}
            className={styles.avatar}
            bare
          />
          <div className={styles.byline}>
            <span className={styles.author}>{post.author?.name}</span>
            <time className={styles.date} dateTime={post.publishedAt}>
              {formatPublishedAt(post.publishedAt)}
            </time>
          </div>
        </header>

        {post.image && (
          <ImageWithFallback
            src={post.image}
            alt={post.title}
            className={styles.cover}
            fallbackText={post.title}
          />
        )}

        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.text}>{post.text}</p>

        <div className={styles.actions}>
          <button
            className={`${styles.like} ${liked ? styles.liked : ''} protoPill`}
            onClick={handleLike}
            aria-pressed={liked}
          >
            {likes} 👍
          </button>
          <button className={styles.share} onClick={handleShare}>
            Поделиться
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
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
    </div>
  )
}
