'use client'

import ImageWithFallback from './ImageWithFallback'
import styles from './ServiceCard.module.css'

interface ServiceCardProps {
  title: string
  image?: string
  onClick?: () => void
}

export default function ServiceCard({ title, image, onClick }: ServiceCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.imageContainer}>
        {image ? (
          <ImageWithFallback 
            src={image} 
            alt={title} 
            className={styles.image}
            fallbackText={title}
          />
        ) : (
          <div className={styles.placeholder}></div>
        )}
      </div>
    </div>
  )
}
