'use client'

import ImageWithFallback from './ImageWithFallback'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  src?: string | null
  size?: number
}

/** Фото человека или инициал на тёмном круге, если фото нет */
export default function Avatar({ name, src, size = 40 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (src) {
    return (
      <span className={styles.avatar} style={style}>
        <ImageWithFallback src={src} alt={name} className={styles.image} bare />
      </span>
    )
  }

  return (
    <span className={`${styles.avatar} ${styles.initial}`} style={style} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
