'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Model3D from '@/components/Model3D'
import ImageWithFallback from '@/components/ImageWithFallback'
import styles from './EquipmentDetail.module.css'
import { getEquipmentById } from '@/services/equipmentService'
import { Equipment } from '@/models/Equipment'

interface EquipmentDetailProps {
  equipmentId: string
}

export default function EquipmentDetail({ equipmentId }: EquipmentDetailProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'3d' | 'jpg'>('jpg')
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getEquipment = async () => {
      setIsLoading(true)
      const equipment = await getEquipmentById(equipmentId)

      setIsLoading(false)
      setEquipment(equipment)
    }

    getEquipment()
  }, [])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Header showBack />
        <div className={`bigLoader ${styles.loader}`}></div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className={styles.container}>
        <Header showBack />
        <div className={styles.notFound}>Оборудование не найдено</div>
      </div>
    )
  }

  // Состав характеристик зависит от типа оборудования, поэтому рендерим что пришло
  const characteristicEntries = Object.entries(equipment.characteristics ?? {})

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.viewMode}>
        <button
          className={`${styles.modeButton} ${viewMode === '3d' ? styles.active : ''}`}
          onClick={() => setViewMode('3d')}
        >
          3D
        </button>
        <button
          className={`${styles.modeButton} ${viewMode === 'jpg' ? styles.active : ''}`}
          onClick={() => setViewMode('jpg')}
        >
          JPG
        </button>
      </div>

      <div className={styles.imageContainer}>
        {viewMode === '3d' && equipment.image3d ? (
          <Model3D 
            src={equipment.image3d} 
            fallbackImage={equipment.image}
            alt={equipment.name}
          />
        ) : (
          <ImageWithFallback 
            src={equipment.image ?? '/equipment/oculus.jpg'}
            alt={equipment.name} 
            className={styles.image}
            fallbackText={equipment.name}
          />
        )}
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{equipment.name}</h1>

        {characteristicEntries.length > 0 && (
          <div className={styles.characteristics}>
            <h2 className={styles.sectionTitle}>Характеристики</h2>

            {characteristicEntries.map(([key, value]) =>
              value && typeof value === 'object' ? (
                <Fragment key={key}>
                  <h3 className={styles.subsectionTitle}>{key}</h3>
                  {Object.entries(value as Record<string, unknown>).map(([nested, nestedValue]) => (
                    <div key={`${key}.${nested}`} className={styles.characteristic}>
                      <span className={styles.label}>{nested}:</span>
                      <span className={styles.value}>{String(nestedValue)}</span>
                    </div>
                  ))}
                </Fragment>
              ) : (
                <div key={key} className={styles.characteristic}>
                  <span className={styles.label}>{key}:</span>
                  <span className={styles.value}>{String(value)}</span>
                </div>
              )
            )}
          </div>
        )}
      </div>


      <button 
        className={styles.bookButton}
        onClick={() => router.push(`/booking/${equipmentId}`)}
      >
        Забронировать
      </button>
    </div>
  )
}
