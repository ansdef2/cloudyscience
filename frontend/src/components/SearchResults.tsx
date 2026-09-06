'use client'

import { useRouter } from 'next/navigation'
import ImageWithFallback from './ImageWithFallback'
import { SearchResult } from '@/services/searchService'
import styles from './SearchResults.module.css'

/** В макете карточки списка подсвечены разными цветами — перебираем по кругу */
const GLOW_CYCLE = [
  'var(--proto-glow-magenta)',
  'var(--proto-glow-amber)',
  'var(--proto-glow-violet)',
  'var(--proto-glow-crimson)',
]

const glowFor = (index: number) => ({ ['--glow' as string]: GLOW_CYCLE[index % GLOW_CYCLE.length] })

const statusLabel = (status?: 'open' | 'closed') =>
  status === 'open' ? 'Открыто' : status === 'closed' ? 'Закрыто' : ''

interface SearchResultsProps {
  results: SearchResult[]
}

export default function SearchResults({ results }: SearchResultsProps) {
  const router = useRouter()

  const open = (result: SearchResult) => {
    if (result.type === 'equipment') router.push(`/equipment/${result.id}`)
    else if (result.type === 'course') router.push(`/course/${result.id}`)
    else if (result.type === 'institution') router.push(`/institution/${result.id}`)
  }

  return (
    <div className={styles.list}>
      {results.map((result, index) => {
        // Специалист — строка с аватаром, без карточки
        if (result.type === 'specialist') {
          return (
            <div key={result.id} className={styles.specialist}>
              <div className={styles.specialistLeft}>
                {result.avatar ? (
                  <ImageWithFallback
                    src={result.avatar}
                    alt={result.name}
                    className={styles.avatar}
                    bare
                  />
                ) : (
                  <div className={styles.avatarFallback}>{result.name.charAt(0)}</div>
                )}
                <div>
                  <div className={styles.specialistName}>{result.name}</div>
                  {result.address && (
                    <div className={styles.specialistPosition}>{result.address}</div>
                  )}
                </div>
              </div>

              <svg className={styles.chatIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )
        }

        // Оборудование — высокая карточка с кнопкой аренды
        if (result.type === 'equipment') {
          return (
            <div
              key={result.id}
              className={styles.tile}
              style={glowFor(index)}
              onClick={() => open(result)}
            >
              <div className={`${styles.glow} protoGlowTall`} />

              <div className={styles.tileText}>
                <p className={styles.tileTitle}>{result.name}</p>
                <div className={styles.tileMeta}>
                  {result.address && <span className={styles.tileAddress}>{result.address}</span>}
                  {result.hours && (
                    <span>
                      {result.hours}{' '}
                      <span className={styles.statusOpen}>{statusLabel(result.status)}</span>
                    </span>
                  )}
                  {result.distance && <span>{result.distance}</span>}
                </div>
              </div>

              <button
                className={`${styles.tileAction} protoPill`}
                onClick={(event) => {
                  event.stopPropagation()
                  router.push(`/booking/${result.id}`)
                }}
              >
                Арендовать
              </button>
            </div>
          )
        }

        // Учреждение или курс — узкая строка
        return (
          <div
            key={result.id}
            className={styles.row}
            style={glowFor(index)}
            onClick={() => open(result)}
          >
            <div className={`${styles.glow} protoGlowRow`} />
            <div className={styles.logoFallback}>{result.name.charAt(0)}</div>

            <div className={styles.rowText}>
              <div className={styles.rowTitle}>{result.name}</div>
              {result.address && <div className={styles.rowMeta}>{result.address}</div>}
              {result.hours && (
                <div className={styles.rowMeta}>
                  {result.hours} <span className={styles.statusOpen}>{statusLabel(result.status)}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
