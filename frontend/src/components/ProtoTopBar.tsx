'use client'

import { useRouter } from 'next/navigation'
import styles from './ProtoTopBar.module.css'

/** Верхняя панель внутренних экранов: назад слева, логотип-действие справа */
interface ProtoTopBarProps {
  onBack?: () => void
}

export default function ProtoTopBar({ onBack }: ProtoTopBarProps) {
  const router = useRouter()

  return (
    <div className={styles.bar}>
      <button
        className={styles.button}
        aria-label="Назад"
        onClick={() => (onBack ? onBack() : router.back())}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 6 9 12l6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button className={styles.button} aria-label="На главную" onClick={() => router.push('/')}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 15a4 4 0 0 1 .9-7.9 5.5 5.5 0 0 1 10.5-1.3A4.4 4.4 0 1 1 16 15H4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
