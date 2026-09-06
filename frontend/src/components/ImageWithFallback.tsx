'use client'

import { useState } from 'react'
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
        src={src}
        alt={alt}
        className={`${styles.image} ${className} ${loading ? styles.hidden : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        style={{ width, height }}
      />
    </>
  )
}
