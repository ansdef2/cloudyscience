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
}

export default function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className = '',
  width,
  height,
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
      {loading && (
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
