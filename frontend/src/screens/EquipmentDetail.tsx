'use client'

import { useEffect, useState } from 'react'
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

    {equipment.characteristics && (
      <div>
        <div className={styles.content}>
          <h1 className={styles.title}>{equipment.name}</h1>
          
          <div className={styles.characteristics}>
            <h2 className={styles.sectionTitle}>Характеристики</h2>
            
            {equipment.characteristics.manufacturer && (
              <div className={styles.characteristic}>
                <span className={styles.label}>Производитель:</span>
                <span className={styles.value}>{equipment.characteristics.manufacturer}</span>
              </div>
            )}
            
            {equipment.characteristics.class && (
              <div className={styles.characteristic}>
                <span className={styles.label}>Класс/тип оборудования:</span>
                <span className={styles.value}>{equipment.characteristics.class}</span>
              </div>
            )}
            
            {equipment.characteristics.materials && (
              <div className={styles.characteristic}>
                <span className={styles.label}>Материалы:</span>
                <span className={styles.value}>{equipment.characteristics.materials}</span>
              </div>
            )}
            
            {equipment.characteristics.tooling && (
              <div className={styles.characteristic}>
                <span className={styles.label}>Оснастка:</span>
                <span className={styles.value}>{equipment.characteristics.tooling}</span>
              </div>
            )}
            
            {equipment.characteristics.software && (
              <div className={styles.characteristic}>
                <span className={styles.label}>Софт:</span>
                <span className={styles.value}>{equipment.characteristics.software}</span>
              </div>
            )}

            {/* Для Oculus Rift - детальные характеристики */}
            {equipment.characteristics.display && (
              <>
                <h3 className={styles.subsectionTitle}>Дисплей и оптика</h3>
                {Object.entries(equipment.characteristics.display).map(([key, value]) => (
                  <div key={key} className={styles.characteristic}>
                    <span className={styles.label}>{key}:</span>
                    <span className={styles.value}>{value as string}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    )}


      <button 
        className={styles.bookButton}
        onClick={() => router.push(`/booking/${equipmentId}`)}
      >
        Забронировать
      </button>
    </div>
  )
}
