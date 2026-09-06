'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ImageWithFallback from '@/components/ImageWithFallback'
import styles from './InstitutionDetail.module.css'
import { Institution } from '@/models/Api'
import { useEffect, useState } from 'react'
import { getInstitutionById } from '@/services/institutionService'

interface InstitutionDetailProps {
  institutionId: string
}

export default function InstitutionDetail({ institutionId }: InstitutionDetailProps) {
  const router = useRouter()
    const [institution, setInstitution] = useState<Institution | 'loading' | null>('loading');
  
    useEffect(() => {
      const findInstitution = async () => {
        const institution = await getInstitutionById(institutionId)

        setInstitution(institution || null);
      }

      findInstitution()
    }, [])

  if (!institution) {
    return (
      <div className={styles.container}>
        <Header showBack />
        <div className={styles.notFound}>Учреждение не найдено</div>
      </div>
    )
  }

  if (institution === 'loading') {
    return (
      <div className={styles.container}>
        <Header showBack />
        <div className="mt-10">
          <div className="bigLoader" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.imageCarousel}>
        <ImageWithFallback 
          src={institution.images[0]} 
          alt={institution.name} 
          className={styles.image}
          fallbackText={institution.name}
        />
        <div className={styles.carouselDots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.name}>{institution.name}</h1>
        <p className={styles.address}>{institution.address}</p>
        <p className={styles.hours}>{institution.hours}</p>

        <div className={styles.actions}>
          <button className={styles.primaryButton}>Записаться</button>
          <button className={styles.secondaryButton}>
            📍 Маршрут
          </button>
          <button className={styles.secondaryButton}>
            📤 Поделиться
          </button>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Контакты</h2>
          <div className={styles.contact}>
            <span className={styles.contactValue}>{institution.phone}</span>
            <span className={styles.contactAction}>Позвонить</span>
          </div>
          <div className={styles.contact}>
            <span className={styles.contactValue}>{institution.website}</span>
            <span className={styles.contactAction}>Перейти</span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Направления обучения</h2>
            <button className={styles.seeAll}>→</button>
          </div>
          <div className={styles.coursesGrid}>
            {institution.courses?.map((course: any) => (
              <div key={course.id} className={styles.courseCard}>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <button 
                  className={styles.courseButton}
                  onClick={() => router.push(`/course/${course.id}`)}
                >
                  Записаться
                </button>
                <p className={styles.spotsLeft}>Осталось {course.spotsLeft} места</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
