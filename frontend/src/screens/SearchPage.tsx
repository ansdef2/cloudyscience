'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoSearchField from '@/components/ProtoSearchField'
import ActionCards from '@/components/ActionCards'
import SearchResults from '@/components/SearchResults'
import { useDebounce } from '@/hooks/useDebounce'
import { search as searchApi, SearchResult, SearchType } from '@/services/searchService'
import styles from './SearchPage.module.css'

const TYPES: { id: SearchType; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'address', label: 'Учреждения' },
  { id: 'equipment', label: 'Оборудование' },
  { id: 'services', label: 'Курсы' },
  { id: 'specialists', label: 'Эксперты' },
]

const typeFrom = (value: string | null): SearchType =>
  TYPES.some((item) => item.id === value) ? (value as SearchType) : 'all'

/**
 * Поиск из нового прототипа: одно поле, смешанная выдача.
 * Пока запрос пустой — показываются карточки действий (экран «Поиск» в макете),
 * с запросом появляются результаты (экраны «Поиск 2» и «Поиск 3»).
 */
export default function SearchPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [type, setType] = useState<SearchType>(typeFrom(searchParams.get('type')))
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
      const items = await searchApi({ query: debouncedQuery, type })

      if (!cancelled) {
        setResults(items)
        setIsLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, type])

  // Тип и запрос — в адресе: ссылкой на поиск можно поделиться, «назад» его сохраняет
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (type !== 'all') params.set('type', type)
    const next = params.toString() ? `/search?${params}` : '/search'
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(null, '', next)
  }, [debouncedQuery, type])

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
          <div className={styles.types} role="tablist" aria-label="Что искать">
            {TYPES.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={type === item.id}
                className={`${styles.type} ${type === item.id ? styles.typeActive : ''}`}
                onClick={() => setType(item.id)}
              >
                {item.label}
              </button>
            ))}
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
