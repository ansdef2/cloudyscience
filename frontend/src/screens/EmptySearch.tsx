'use client'

import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import styles from './EmptySearch.module.css'

export default function EmptySearch() {
  return (
    <div className={styles.container}>
      <Header showBack />
      <SearchBar placeholder="Поиск" />
      
      <div className={styles.emptyState}>
        <div className={styles.icon}>🔍</div>
        <h2 className={styles.title}>Ничего не найдено</h2>
        <p className={styles.description}>
          Попробуйте изменить параметры поиска или использовать другие ключевые слова
        </p>
      </div>
    </div>
  )
}
