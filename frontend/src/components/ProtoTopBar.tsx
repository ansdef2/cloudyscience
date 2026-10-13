'use client'

import { useRouter } from 'next/navigation'
import { APP_HOME } from '@/utils/navigation'
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

      {/* Знак логотипа справа — как в макете */}
      <button className={styles.button} aria-label="На главную" onClick={() => router.push(APP_HOME)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.mark} src="/brand/mark.webp" alt="" width={24} height={24} />
      </button>
    </div>
  )
}
