'use client'

import { useRouter } from 'next/navigation'
import styles from './EquipmentCard.module.css'

interface Equipment {
  id: string
  name: string
  type: string
  address: string
  hours: string
  status: 'open' | 'closed'
  distance?: string
  image?: string
  image3d?: string
}

interface EquipmentCardProps {
  equipment: Equipment
  onClick?: () => void
}

export default function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {
  const router = useRouter()

  const handleRent = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/booking/${equipment.id}`)
  }

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.content}>
        <div className={styles.info}>
          <h3 className={styles.name}>{equipment.name}</h3>
          <p className={styles.address}>{equipment.address}</p>
          <div className={styles.meta}>
            <span className={styles.hours}>{equipment.hours}</span>
            <span className={`${styles.status} ${styles[equipment.status]}`}>
              {equipment.status === 'open' ? 'Открыто' : 'Закрыто'}
            </span>
          </div>
          {equipment.distance && (
            <p className={styles.distance}>{equipment.distance}</p>
          )}
        </div>
      </div>
      <button 
        className={styles.rentButton}
        onClick={handleRent}
      >
        Арендовать
      </button>
    </div>
  )
}
