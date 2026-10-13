'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import CourseCard from '@/components/CourseCard'
import { Institution } from '@/models/Api'
import { getInstitutionById } from '@/services/institutionService'
import { useToast } from '@/hooks/useToast'
import { shareLink } from '@/utils/share'
import styles from './InstitutionDetail.module.css'

interface InstitutionDetailProps {
  institutionId: string
}

/** Точка для карт: координаты, если есть, иначе адрес в Великом Новгороде */
const coordinatesOrAddress = (institution: Institution) =>
  institution.latitude != null && institution.longitude != null
    ? `${institution.latitude},${institution.longitude}`
    : `Великий Новгород, ${institution.address}`

const mapsUrl = (institution: Institution) =>
  institution.latitude != null && institution.longitude != null
    ? `https://yandex.ru/maps/?pt=${institution.longitude},${institution.latitude}&z=17&l=map`
    : `https://yandex.ru/maps/?text=${encodeURIComponent(coordinatesOrAddress(institution))}`

export default function InstitutionDetail({ institutionId }: InstitutionDetailProps) {
  const router = useRouter()
  const toast = useToast()
  const [institution, setInstitution] = useState<Institution | 'loading' | null>('loading')
  const [menuOpen, setMenuOpen] = useState(false)

  // Меню «Ещё» закрывается кликом мимо и Escape
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !(event.target as Element).closest('[role=menu], [aria-label="Ещё"]')
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  useEffect(() => {
    getInstitutionById(institutionId).then((found) => setInstitution(found || null))
  }, [institutionId])

  if (institution === 'loading') {
    return (
      <div className={`${styles.container} protoPage`}>
        <ProtoTopBar />
        <div className="bigLoader" style={{ marginTop: 60 }} />
      </div>
    )
  }

  if (!institution) {
    return (
      <div className={`${styles.container} protoPage`}>
        <ProtoTopBar />
        <div className={styles.notFound}>Учреждение не найдено</div>
      </div>
    )
  }

  const share = async () => {
    setMenuOpen(false)
    const result = await shareLink(institution.name, `/institution/${institution.id}`)
    if (result === 'copied') toast.success('Ссылка скопирована')
    if (result === 'failed') toast.error('Не удалось поделиться')
  }

  const copyAddress = async () => {
    setMenuOpen(false)
    try {
      await navigator.clipboard.writeText(`Великий Новгород, ${institution.address}`)
      toast.success('Адрес скопирован')
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const hours = institution.hours || institution.workingHours
  const statusText = institution.isOpen ? `Открыто до ${hours?.split('-')[1] ?? ''}` : 'Закрыто'

  return (
    <div className={`${styles.container} protoPage`}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={`${styles.heroGlow} protoGlowHero`} />

          <div className={styles.photo}>
            <ImageWithFallback
              src={institution.images?.[0] ?? ''}
              alt={institution.name}
              className={styles.photoImage}
              fallbackText={institution.name}
            />
            <div className={`${styles.photoGlow} protoPhotoGlow`} />
          </div>

          <div className={styles.info}>
            <h1 className={styles.name}>{institution.name}</h1>
            <p className={styles.address}>{institution.address}</p>
            <div className={styles.status}>
              {statusText}
              <svg className={styles.statusChevron} viewBox="0 0 8 8" fill="none" aria-hidden>
                <path
                  d="m1 3 3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryAction}
              onClick={() => {
                const first = institution.courses?.[0]
                if (first) router.push(`/course/${first.id}`)
              }}
            >
              Записаться
            </button>

            {institution.phone && (
              <a className={styles.iconAction} href={`tel:${institution.phone}`} aria-label="Позвонить">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.5 4h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.7 1.5A16.5 16.5 0 0 1 5 6.7 1.5 1.5 0 0 1 6.5 4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}

            {institution.website && (
              <a
                className={styles.iconAction}
                href={institution.website}
                target="_blank"
                rel="noreferrer"
                aria-label="Сайт"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5s-1.1 6.1-3.3 8.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </a>
            )}

            <div className={styles.moreWrap}>
              <button
                className={styles.iconAction}
                aria-label="Ещё"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
                </svg>
              </button>
              {menuOpen && (
                <div className={styles.moreMenu} role="menu">
                  <button role="menuitem" onClick={share}>
                    Поделиться
                  </button>
                  <a
                    role="menuitem"
                    href={mapsUrl(institution)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    Открыть в Яндекс Картах
                  </a>
                  <a
                    role="menuitem"
                    href={`https://yandex.ru/maps/?rtext=~${encodeURIComponent(coordinatesOrAddress(institution))}&rtt=auto`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    Построить маршрут
                  </a>
                  <button role="menuitem" onClick={copyAddress}>
                    Скопировать адрес
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Направления обучения</h2>
            <button
              className={styles.sectionChevron}
              aria-label="Все направления"
              onClick={() => router.push('/search?q=' + encodeURIComponent(institution.name))}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="m9 6 6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className={styles.carousel}>
            {institution.courses && institution.courses.length > 0 ? (
              institution.courses.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)
            ) : (
              <p className={styles.empty}>Направления пока не добавлены</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
