'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import SearchResultCard from '@/components/SearchResultCard'
import { useDebounce } from '@/hooks/useDebounce'
import styles from './SearchPage.module.css'
import { search as searchApi, SearchResult, SearchType } from '@/services/searchService'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(query)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchType, setSearchType] = useState<SearchType>('address')
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    if (!debouncedSearchQuery) {
      setResults([])
      return
    }

    let cancelled = false

    const doSearch = async () => {
      setIsLoading(true)
      const items = await searchApi({ query: debouncedSearchQuery, type: searchType })

      if (!cancelled) {
        setResults(items)
        setIsLoading(false)
      }
    }

    doSearch()

    return () => {
      cancelled = true
    }
  }, [debouncedSearchQuery, searchType])

  return (
    <div className={styles.container}>
      <Header showBack />
      <SearchBar
        placeholder="Поиск"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <div className={styles.searchTabs}>
        <button
          className={`${styles.tab} ${searchType === 'address' ? styles.active : ''}`}
          onClick={() => setSearchType('address')}
        >
          По адресу
        </button>
        <button
          className={`${styles.tab} ${searchType === 'specialists' ? styles.active : ''}`}
          onClick={() => setSearchType('specialists')}
        >
          По специалистам
        </button>
        <button
          className={`${styles.tab} ${searchType === 'services' ? styles.active : ''}`}
          onClick={() => setSearchType('services')}
        >
          По услугам
        </button>
      </div>

      <div className={styles.results}>
        {isLoading ? (
          <div className="bigLoader"></div>
        ) : results.length > 0 ? (
          results.map(result => (
            <SearchResultCard key={result.id} result={result} />
          ))
        ) : searchQuery ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>Ничего не найдено</p>
            <p className={styles.emptyHint}>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💡</div>
            <p>Введите запрос для поиска</p>
          </div>
        )}
      </div>
    </div>
  )
}
