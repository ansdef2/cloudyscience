'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import SearchBar from '@/components/SearchBar'
import EquipmentCard from '@/components/EquipmentCard'
import styles from './EquipmentCatalog.module.css'
import { Equipment } from '@/models/Equipment'
import { getEquipmentList } from '@/services/equipmentService'
import { useDebounce } from '@/hooks/useDebounce'

export default function EquipmentCatalog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const [searchQuery, setSearchQuery] = useState('')
  const [equipmentItems, setEquipmentItems] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const handleEquipmentClick = (id: string) => {
    router.push(`/equipment/${id}`)
  }

  useEffect(() => {
    let cancelled = false

    const getEquipment = async () => {
      setIsLoading(true)
      const equipmentList = await getEquipmentList({
        type: type || undefined,
        search: debouncedSearchQuery || undefined,
      })

      if (!cancelled) {
        setEquipmentItems(equipmentList)
        setIsLoading(false)
      }
    }

    getEquipment()

    return () => {
      cancelled = true
    }
  }, [type, debouncedSearchQuery]);

  return (
    <div className={styles.container}>
      <Header showBack />
      <SearchBar
        placeholder="Поиск оборудования"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <div className={styles.equipmentList}>
        {isLoading ?
          <div className="bigLoader"></div> :
          equipmentItems.length > 0 ? (
              equipmentItems.map(item => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  onClick={() => handleEquipmentClick(item.id)}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>Оборудование не найдено</p>
              </div>
            )
        }
      </div>
    </div>
  )
}
