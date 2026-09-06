'use client'

import styles from './FeatureCard.module.css'

interface FeatureCardProps {
  title: string
  description: string
  icon: string
  gradient?: 'purple' | 'blue' | 'orange'
}

export default function FeatureCard({ title, description, icon, gradient = 'purple' }: FeatureCardProps) {
  return (
    <div className={`${styles.card} ${styles[gradient]}`}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </div>
  )
}
