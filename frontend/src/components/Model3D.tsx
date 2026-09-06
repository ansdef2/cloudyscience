'use client'

import { useState, useEffect } from 'react'
import styles from './Model3D.module.css'

interface Model3DProps {
  src: string
  fallbackImage?: string
  alt?: string
}

export default function Model3D({ src, fallbackImage, alt = '3D Model' }: Model3DProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Симуляция загрузки 3D модели
    const timer = setTimeout(() => {
      setLoading(false)
      // В реальном приложении здесь будет проверка загрузки модели
      // Если модель не загрузилась, установить error = true
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (error && fallbackImage) {
    return (
      <div className={styles.container}>
        <img src={fallbackImage} alt={alt} className={styles.fallbackImage} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка 3D модели...</p>
        </div>
      ) : (
        <div className={styles.modelContainer}>
          {/* Здесь можно интегрировать Three.js, React Three Fiber или другой 3D viewer */}
          {/* Для примера используем iframe или canvas */}
          <div className={styles.modelPlaceholder}>
            <p>3D модель: {src}</p>
            <p className={styles.note}>
              Для отображения 3D модели необходимо интегрировать Three.js или другой 3D viewer.
              Модель должна быть загружена в S3 хранилище.
            </p>
          </div>
          {fallbackImage && (
            <img src={fallbackImage} alt={alt} className={styles.fallbackImage} />
          )}
        </div>
      )}
    </div>
  )
}
