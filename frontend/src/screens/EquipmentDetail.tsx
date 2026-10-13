'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import Model3D from '@/components/Model3D'
import IotStatus from '@/components/IotStatus'
import { getEquipmentById } from '@/services/equipmentService'
import { Equipment, SpecSection } from '@/models/Equipment'
import styles from './EquipmentDetail.module.css'

/** Заголовок блока: одноимённый подраздел внутри него не дублируем. */
const SPECS_TITLE = 'Характеристики'

/**
 * Характеристики приходят массивом разделов (порядок задан импортом справочника),
 * но у демо-позиций может остаться плоский объект — поддерживаем оба вида.
 */
function toSections(characteristics: Equipment['characteristics']): SpecSection[] {
  if (!characteristics) return []
  if (Array.isArray(characteristics)) return characteristics

  return [
    {
      // Без имени: блок целиком уже озаглавлен «Характеристики»,
      // иначе заголовок задваивается
      section: '',
      rows: Object.entries(characteristics).map(([label, value]) => ({
        label,
        value: String(value),
      })),
    },
  ]
}

interface EquipmentDetailProps {
  equipmentId: string
}

export default function EquipmentDetail({ equipmentId }: EquipmentDetailProps) {
  const router = useRouter()
  const [equipment, setEquipment] = useState<Equipment | 'loading' | null>('loading')
  const [viewMode, setViewMode] = useState<'3d' | 'jpg'>('jpg')

  useEffect(() => {
    getEquipmentById(equipmentId).then((found) => setEquipment(found || null))
  }, [equipmentId])

  if (equipment === 'loading') {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className="bigLoader" style={{ marginTop: 60 }} />
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className={styles.notFound}>Оборудование не найдено</div>
      </div>
    )
  }

  const sections = toSections(equipment.characteristics)
  const book = () => router.push(`/booking/${equipmentId}`)

  return (
    <div className={styles.container}>
      <ProtoTopBar />

      <div className={styles.hero}>
        <div className={`${styles.heroGlow} protoGlowHero`} />

        <div className={styles.heroHead}>
          <h1 className={styles.title}>{equipment.name}</h1>
          {equipment.address && <p className={styles.address}>{equipment.address}</p>}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${viewMode === '3d' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('3d')}
          >
            3D
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'jpg' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('jpg')}
          >
            JPG
          </button>
        </div>

        <div className={styles.photo}>
          {viewMode === '3d' && equipment.image3d ? (
            <Model3D src={equipment.image3d} fallbackImage={equipment.image} alt={equipment.name} />
          ) : (
            <ImageWithFallback
              src={equipment.image ?? ''}
              alt={equipment.name}
              className={styles.photoImage}
              fallbackText={equipment.name}
            />
          )}
        </div>

        <button className={styles.bookButton} onClick={book}>
          Забронировать
        </button>
      </div>

      <IotStatus equipmentId={equipment.id} />

      {sections.length > 0 && (
        <div className={styles.specs}>
          <h2 className={styles.specsTitle}>{SPECS_TITLE}</h2>

          {sections.map((section) => (
            <section key={section.section} className={styles.section}>
              {section.section && section.section !== SPECS_TITLE && (
                <h3 className={styles.sectionTitle}>{section.section}</h3>
              )}
              <div className={styles.rows}>
                {section.rows.map((row) => (
                  <div key={`${section.section}-${row.label}`} className={styles.row}>
                    <span className={styles.label}>{row.label}</span>
                    <span className={styles.value}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <button className={styles.footerButton} onClick={book}>
        Забронировать
      </button>
    </div>
  )
}
