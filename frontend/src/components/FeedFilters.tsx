'use client'

import { PostSort } from '@/services/postService'
import styles from './FeedFilters.module.css'

/** Чипы над лентой: сортировка и фильтры */
interface FeedFiltersProps {
  sort: PostSort
  onSortChange: (sort: PostSort) => void
}

export default function FeedFilters({ sort, onSortChange }: FeedFiltersProps) {
  return (
    <div className={styles.filters}>
      <button
        className={`${styles.chip} ${sort === 'popular' ? styles.chipActive : ''}`}
        onClick={() => onSortChange('popular')}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M6 12h12M9 17h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        По популярности
      </button>

      <button
        className={`${styles.chip} ${sort === 'new' ? styles.chipActive : ''}`}
        onClick={() => onSortChange('new')}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Сначала новые
      </button>
    </div>
  )
}
