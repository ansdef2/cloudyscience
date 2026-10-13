'use client'

import { useEffect, useRef, useState } from 'react'
import { fileUrl } from '@/services/uploadService'
import styles from './ImageWithFallback.module.css'

interface ImageWithFallbackProps {
  src: string
  alt: string
  fallbackText?: string
  className?: string
  width?: number
  height?: number
  /**
   * Для декоративных изображений: пока картинки нет, не рисовать заглушку,
   * иначе непрозрачный блок перекрывает градиент карточки.
   */
  bare?: boolean
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className = '',
  width,
  height,
  bare = false,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const imageRef = useRef<HTMLImageElement>(null)

  /**
   * Картинка из кэша успевает догрузиться до того, как React навесит onLoad,
   * и тогда событие не приходит — изображение так и остаётся скрытым.
   * Поэтому состояние сверяется с img.complete после монтирования.
   */
  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    if (image.complete) {
      if (image.naturalWidth > 0) setLoading(false)
      else setError(true)
    }
  }, [src])

  const handleError = () => {
    setError(true)
    setLoading(false)
  }

  const handleLoad = () => {
    setLoading(false)
  }

  if (error) {
    if (bare) return null

    return (
      <div 
        className={`${styles.placeholder} ${className}`}
        style={{ width, height }}
      >
        <div className={styles.placeholderContent}>
          <span className={styles.placeholderIcon}>📷</span>
          {fallbackText && (
            <span className={styles.placeholderText}>{fallbackText}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {loading && !bare && (
        <div 
          className={`${styles.loading} ${className}`}
          style={{ width, height }}
        >
          <div className={styles.spinner}></div>
        </div>
      )}
      <img
        ref={imageRef}
        // Загруженные через админку картинки лежат на бэкенде (/api/files/...)
        src={fileUrl(src) ?? src}
        alt={alt}
        // В режиме bare прятать нечем и незачем: заглушки под картинкой нет
        className={`${styles.image} ${className} ${loading && !bare ? styles.hidden : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        style={{ width, height }}
      />
    </>
  )
}
