'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ProtoSearchField from '@/components/ProtoSearchField'
import { useDebounce } from '@/hooks/useDebounce'
import { Equipment } from '@/models/Equipment'
import { getEquipmentList } from '@/services/equipmentService'
import styles from './EquipmentCatalog.module.css'

/** Свечения карточек чередуются, как в списках макета */
const GLOW_CYCLE = [
  'var(--proto-glow-violet)',
  'var(--proto-glow-crimson)',
  'var(--proto-glow-magenta)',
  'var(--proto-glow-amber)',
]

export default function EquipmentCatalog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')

  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      const list = await getEquipmentList({
        type: type || undefined,
        search: debouncedSearchQuery || undefined,
      })

      if (!cancelled) {
        setItems(list)
        setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [type, debouncedSearchQuery])

  return (
    <div className={styles.container}>
      <ProtoTopBar />

      <div className={styles.content}>
        <ProtoSearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Поиск оборудования"
        />

        {isLoading ? (
          <div className={`bigLoader ${styles.loader}`} />
        ) : items.length > 0 ? (
          <div className={styles.list}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className={styles.card}
                style={{ ['--glow' as string]: GLOW_CYCLE[index % GLOW_CYCLE.length] }}
                onClick={() => router.push(`/equipment/${item.id}`)}
              >
                <div className={`${styles.glow} protoGlowTall`} />

                <div className={styles.text}>
                  <p className={styles.name}>{item.name}</p>
                  <div className={styles.meta}>
                    {item.address && <span className={styles.address}>{item.address}</span>}
                    <span>
                      {item.hours} {item.status === 'open' ? 'Открыто' : 'Закрыто'}
                    </span>
                    {item.distance && <span>{item.distance}</span>}
                  </div>
                </div>

                <button
                  className={`${styles.action} protoPill`}
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(`/booking/${item.id}`)
                  }}
                >
                  Арендовать
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>Оборудование не найдено</p>
        )}
      </div>
    </div>
  )
}
