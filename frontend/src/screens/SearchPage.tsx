'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoSearchField from '@/components/ProtoSearchField'
import ActionCards from '@/components/ActionCards'
import SearchResults from '@/components/SearchResults'
import { useDebounce } from '@/hooks/useDebounce'
import { search as searchApi, SearchResult } from '@/services/searchService'
import styles from './SearchPage.module.css'

/**
 * Поиск из нового прототипа: одно поле, смешанная выдача.
 * Пока запрос пустой — показываются карточки действий (экран «Поиск» в макете),
 * с запросом появляются результаты (экраны «Поиск 2» и «Поиск 3»).
 */
export default function SearchPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      const items = await searchApi({ query: debouncedQuery, type: 'all' })

      if (!cancelled) {
        setResults(items)
        setIsLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const hasQuery = Boolean(debouncedQuery.trim())

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.head}>
          <h1 className={`${styles.pageTitle} protoDesktopOnly`}>Поиск</h1>
          <div className={styles.searchBox}>
            <ProtoSearchField value={query} onChange={setQuery} autoFocus />
          </div>
        </div>

        {!hasQuery && (
          <div className={styles.actions}>
            <ActionCards />
          </div>
        )}

        {hasQuery && isLoading && <div className={`bigLoader ${styles.loader}`} />}

        {hasQuery && !isLoading && results.length > 0 && <SearchResults results={results} />}

        {hasQuery && !isLoading && results.length === 0 && (
          <p className={styles.empty}>Ничего не найдено</p>
        )}
      </div>
    </div>
  )
}
