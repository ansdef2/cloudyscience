'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import ModuleDashboard from '@/components/ModuleDashboard'
import { Course } from '@/models/Api'
import { enrollInCourse, getCourseById } from '@/services/institutionService'
import { ApiError } from '@/utils/api'
import { pluralize } from '@/utils/format'
import { loginPathFromHere } from '@/utils/navigation'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import styles from './CourseDetail.module.css'

interface CourseDetailProps {
  courseId: string
}

export default function CourseDetail({ courseId }: CourseDetailProps) {
  const router = useRouter()
  const toast = useToast()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const enrollRef = useRef<HTMLDivElement>(null)

  const [course, setCourse] = useState<Course | 'loading' | null>('loading')
  const [agreed, setAgreed] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [completedStageIds, setCompletedStageIds] = useState<string[]>([])

  useEffect(() => {
    getCourseById(courseId).then((found) => {
      setCourse(found || null)
      setCompletedStageIds(found?.completedStageIds ?? [])
    })
    // Запись и прогресс личные: после входа или выхода карточку нужно перечитать
  }, [courseId, isAuthenticated])

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(loginPathFromHere())
      return
    }

    if (!agreed) {
      toast.error('Нужно согласие на обработку персональных данных')
      return
    }

    setIsEnrolling(true)

    try {
      const result = await enrollInCourse(courseId)
      setCourse((current) =>
        current && current !== 'loading'
          ? { ...current, ...result, spotsLeft: result.availableSpots }
          : current
      )
      toast.success('Вы записаны на курс! Прогресс по этапам теперь сохраняется')
    } catch (error) {
      const code = error instanceof ApiError ? error.data?.code : undefined

      if (code === 'ALREADY_ENROLLED') {
        // Записался в другой вкладке — просто показываем актуальное состояние
        const fresh = await getCourseById(courseId)
        if (fresh) {
          setCourse(fresh)
          setCompletedStageIds(fresh.completedStageIds ?? [])
        }
        toast.info('Вы уже записаны на этот курс')
      } else if (code === 'NO_SPOTS') {
        setCourse((current) =>
          current && current !== 'loading' ? { ...current, availableSpots: 0, spotsLeft: 0 } : current
        )
        toast.error('Свободных мест не осталось')
      } else {
        toast.error('Не удалось записаться. Попробуйте позже')
      }
    } finally {
      setIsEnrolling(false)
    }
  }

  if (course === 'loading') {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className="bigLoader" style={{ marginTop: 60 }} />
      </div>
    )
  }

  if (!course) {
    return (
      <div className={styles.container}>
        <ProtoTopBar />
        <div className={styles.notFound}>Направление не найдено</div>
      </div>
    )
  }

  const enrolled = Boolean(course.isEnrolled)
  const spots = course.spotsLeft ?? course.availableSpots ?? 0
  const total = course.totalSpots ?? 0
  const taken = Math.max(0, total - spots)

  return (
    <div className={styles.container}>
      <ProtoTopBar />

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={`${styles.heroGlow} protoGlowHero`} />

          <div className={styles.heroText}>
            <h1 className={styles.title}>{course.direction || course.title}</h1>
            {course.address && <p className={styles.address}>{course.address}</p>}
            <p className={`${styles.spots} protoBrandText`}>
              {enrolled
                ? 'Вы записаны на курс'
                : `Осталось ${spots} ${pluralize(spots, [
                    'свободное место',
                    'свободных места',
                    'свободных мест',
                  ])} из ${total}`}
            </p>
          </div>

          <div className={styles.photo}>
            <ImageWithFallback
              src={course.images?.[0] ?? ''}
              alt={course.title}
              className={styles.photoImage}
              fallbackText={course.title}
            />
            <div className={`${styles.photoGlow} protoPhotoGlow`} />
          </div>
        </div>

        {course.description && <p className={styles.description}>{course.description}</p>}

        {!enrolled && (
          <div className={styles.booking} ref={enrollRef}>
            <div className={`${styles.bookingGlow} protoGlowHero`} />

            <div className={styles.bookingHead}>
              <h2 className={styles.bookingTitle}>Записаться на курс</h2>
              <p className={styles.bookingSubtitle}>
                «{course.title}». После записи откроется личный прогресс: отмечайте пройденные
                этапы, и он сохранится в вашей учётной записи
              </p>
            </div>

            <div className={styles.meter}>
              <div className={styles.meterHead}>
                <span>Занято мест</span>
                <span className={styles.meterValue}>
                  {taken} из {total}
                </span>
              </div>
              <div
                className={styles.meterTrack}
                role="progressbar"
                aria-label="Занято мест"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={taken}
              >
                <div
                  className={styles.meterFill}
                  style={{ width: `${total ? (taken / total) * 100 : 0}%` }}
                />
              </div>
              <p className={styles.meterNote}>Одна запись на человека</p>
            </div>

            {isAuthenticated && spots > 0 && (
              <label className={styles.check}>
                <span className={styles.checkBox} onClick={() => setAgreed(!agreed)}>
                  {agreed && (
                    <svg className={styles.checkBoxIcon} viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path
                        d="m2 7.5 3.5 3.5L12 3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span>
                  Я согласен/согласна на{' '}
                  <span className={styles.link}>обработку персональных данных</span>
                </span>
              </label>
            )}

            <button
              className={styles.submit}
              onClick={handleEnroll}
              disabled={isEnrolling || authLoading || spots <= 0}
            >
              {spots <= 0
                ? 'Мест нет'
                : isEnrolling
                  ? 'Записываем...'
                  : isAuthenticated
                    ? 'Записаться'
                    : 'Войти и записаться'}
            </button>
          </div>
        )}

        {course.modules?.map((module) => (
          <ModuleDashboard
            key={module.id}
            module={module}
            completedStageIds={completedStageIds}
            onProgressChange={setCompletedStageIds}
            isAuthenticated={isAuthenticated}
            isEnrolled={enrolled}
            onEnrollRequest={() => enrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          />
        ))}
      </div>
    </div>
  )
}
