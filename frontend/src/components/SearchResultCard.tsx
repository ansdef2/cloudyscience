'use client'

import { useRouter } from 'next/navigation'
import styles from './SearchResultCard.module.css'

interface SearchResult {
  id: string
  name: string
  address?: string
  hours?: string
  status?: 'open' | 'closed'
  distance?: string
  type?: 'equipment' | 'specialist' | 'institution' | 'course'
  avatar?: string
}

interface SearchResultCardProps {
  result: SearchResult
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (result.type === 'equipment') {
      router.push(`/equipment/${result.id}`)
    } else if (result.type === 'course') {
      router.push(`/course/${result.id}`)
    } else if (result.type === 'specialist') {
      router.push(`/specialist/${result.id}`)
    } else {
      router.push(`/institution/${result.id}`)
    }
  }

  if (result.type === 'specialist') {
    return (
      <div className={styles.card} onClick={handleClick}>
        <div className={styles.avatar}>
          {result.avatar ? (
            <>
              <img src={result.avatar} alt={result.name} onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove(styles.hidden)
              }} />
              <div className={`${styles.avatarPlaceholder} ${styles.hidden}`}>
                <span>👤</span>
              </div>
            </>
          ) : (
            <div className={styles.avatarPlaceholder}>
              <span>👤</span>
            </div>
          )}
        </div>
        <div className={styles.name}>{result.name}</div>
        <button className={styles.moreButton}>⋮</button>
      </div>
    )
  }

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.content}>
        <h3 className={styles.name}>{result.name}</h3>
        {result.address && (
          <p className={styles.address}>{result.address}</p>
        )}
        {result.hours && (
          <div className={styles.meta}>
            <span className={styles.hours}>{result.hours}</span>
            {result.status && (
              <span className={`${styles.status} ${styles[result.status]}`}>
                {result.status === 'open' ? 'Открыто' : 'Закрыто'}
              </span>
            )}
          </div>
        )}
        {result.distance && (
          <p className={styles.distance}>{result.distance}</p>
        )}
      </div>
      {result.type === 'equipment' && (
        <button 
          className={styles.rentButton}
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/booking/${result.id}`)
          }}
        >
          Арендовать
        </button>
      )}
    </div>
  )
}
