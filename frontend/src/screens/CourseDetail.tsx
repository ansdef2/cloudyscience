'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtoTopBar from '@/components/ProtoTopBar'
import ImageWithFallback from '@/components/ImageWithFallback'
import ProtoCalendar from '@/components/ProtoCalendar'
import { Course } from '@/models/Api'
import { bookCourse, getCourseById } from '@/services/institutionService'
import { pluralize } from '@/utils/format'
import { useToast } from '@/hooks/useToast'
import styles from './CourseDetail.module.css'

const AVAILABLE_TIMES = ['14:00', '16:00']

interface CourseDetailProps {
  courseId: string
}

export default function CourseDetail({ courseId }: CourseDetailProps) {
  const router = useRouter()
  const toast = useToast()

  const [course, setCourse] = useState<Course | 'loading' | null>('loading')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(true)
  const [wantReminder, setWantReminder] = useState(true)
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    getCourseById(courseId).then((found) => setCourse(found || null))
  }, [courseId])

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Выберите дату и время')
      return
    }

    if (!agreed) {
      toast.error('Нужно согласие на обработку персональных данных')
      return
    }

    setIsBooking(true)

    try {
      await bookCourse({
        courseId,
        date: selectedDate,
        time: selectedTime,
        agreeToDataProcessing: agreed,
        wantReminder,
        addToCalendar,
      })

      toast.success('Запись создана!')
      router.push('/')
    } catch {
      toast.error('Не удалось записаться. Попробуйте позже')
    } finally {
      setIsBooking(false)
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

  const spots = course.spotsLeft ?? course.availableSpots ?? 0
  const now = new Date()

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
              Осталось {spots} {pluralize(spots, ['свободное место', 'свободных места', 'свободных мест'])}
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

        <div className={styles.booking}>
          <div className={`${styles.bookingGlow} protoGlowHero`} />

          <div className={styles.bookingHead}>
            <h2 className={styles.bookingTitle}>Записаться на консультацию</h2>
            <p className={styles.bookingSubtitle}>
              Расскажем про направления и запишем на занятия
            </p>
          </div>

          <div className={styles.picker}>
            <ProtoCalendar
              year={now.getFullYear()}
              month={now.getMonth() + 1}
              selected={selectedDate}
              onSelect={setSelectedDate}
            />

            <div className={styles.times}>
              <p className={styles.timesLabel}>Время:</p>
              <div className={styles.timeList}>
                {AVAILABLE_TIMES.map((time) => (
                  <button
                    key={time}
                    className={`${styles.timeChip} ${
                      selectedTime === time ? styles.timeChipActive : ''
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className={styles.submit} onClick={handleBook} disabled={isBooking}>
            {isBooking ? 'Отправляем...' : 'Записаться'}
          </button>
        </div>

        <div className={styles.checks}>
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
              Я согласен/согласна на <span className={styles.link}>обработку персональных данных</span>
            </span>
          </label>

          <label className={styles.check}>
            <span className={styles.checkBox} onClick={() => setWantReminder(!wantReminder)}>
              {wantReminder && (
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
            <span>Я хочу получить напоминание о записи на почту</span>
          </label>

          <label className={styles.check}>
            <span className={styles.checkBox} onClick={() => setAddToCalendar(!addToCalendar)}>
              {addToCalendar && (
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
            <span>Добавить событие в личный календарь</span>
          </label>
        </div>
      </div>
    </div>
  )
}
