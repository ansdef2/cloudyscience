'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import CourseCard from '@/components/CourseCard'
import { Institution } from '@/models/Api'
import { getInstitutionById } from '@/services/institutionService'
import styles from './InstitutionDetail.module.css'

interface InstitutionDetailProps {
  institutionId: string
}

export default function InstitutionDetail({ institutionId }: InstitutionDetailProps) {
  const router = useRouter()
  const [institution, setInstitution] = useState<Institution | 'loading' | null>('loading')

  useEffect(() => {
    getInstitutionById(institutionId).then((found) => setInstitution(found || null))
  }, [institutionId])

  if (institution === 'loading') {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className="bigLoader" style={{ marginTop: 60 }} />
      </div>
    )
  }

  if (!institution) {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className={styles.notFound}>Учреждение не найдено</div>
      </div>
    )
  }

  const hours = institution.hours || institution.workingHours
  const statusText = institution.isOpen ? `Открыто до ${hours?.split('-')[1] ?? ''}` : 'Закрыто'

  return (
    <div className={styles.container}>
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

            <button className={styles.iconAction} aria-label="Ещё">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </button>
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
              institution.courses.map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))
            ) : (
              <p className={styles.empty}>Направления пока не добавлены</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
