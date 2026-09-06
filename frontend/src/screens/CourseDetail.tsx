'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ImageWithFallback from '@/components/ImageWithFallback'
import styles from './CourseDetail.module.css'
import { bookCourse, getCourseById } from '@/services/institutionService'
import { toIsoDate } from '@/utils/format'
import { useToast } from '@/hooks/useToast'
import { Course } from '@/models/Api'

interface CourseDetailProps {
  courseId: string
}

// Календарь записи показывает фиксированный месяц и отдаёт только номер дня
const CALENDAR_YEAR = 2025
const CALENDAR_MONTH = 7

export default function CourseDetail({ courseId }: CourseDetailProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [agreedToDataProcessing, setAgreedToDataProcessing] = useState(true)
  const [wantReminder, setWantReminder] = useState(true)
  const [addToCalendar, setAddToCalendar] = useState(false)
  const [course, setCourse] = useState<Course | 'loading' | null>('loading');
  const [isBooking, setIsBooking] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const findCourse = async () => {
      const course = await getCourseById(courseId)

      setCourse(course || null);
    }

    findCourse()
  }, [courseId])

  if (course === null) {
    return (
      <div className={styles.container}>
        <Header showBack />
        <div className={styles.notFound}>Направление не найдено</div>
      </div>
    )
  }

  if (course === 'loading') {
    return (
      <div className={styles.container}>
        <Header showBack />
          <div className="bigLoader" />
      </div>
    )
  }

  // Генерация недоступных дат (выходные дни)
  const generateUnavailableDates = () => {
    const unavailable: number[] = []
    for (let i = 1; i <= 31; i++) {
      const date = new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, i)
      const dayOfWeek = date.getDay()
      // Выходные дни недоступны, кроме некоторых
      if ((dayOfWeek === 0 || dayOfWeek === 6) && 
          !(i >= 5 && i <= 6) && 
          !(i >= 12 && i <= 13) && 
          !(i >= 19 && i <= 20) && 
          !(i >= 26 && i <= 27)) {
        unavailable.push(i)
      }
    }
    return unavailable
  }

  const unavailableDates = generateUnavailableDates()
  const availableTimes = ['14:00', '16:00']

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Пожалуйста, выберите дату и время')
      return
    }

    if (!agreedToDataProcessing) {
      toast.error('Нужно согласие на обработку персональных данных')
      return
    }

    setIsBooking(true)

    try {
      await bookCourse({
        courseId,
        date: toIsoDate(CALENDAR_YEAR, CALENDAR_MONTH, selectedDate),
        time: selectedTime,
        agreeToDataProcessing: agreedToDataProcessing,
        wantReminder,
        addToCalendar,
      })

      toast.success('Запись создана!')
      router.push('/')
    } catch (error) {
      toast.error('Не удалось записаться. Попробуйте позже')
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className={styles.container}>
      <Header showBack />
      
      <div className={styles.imageCarousel}>
        <ImageWithFallback 
          src={course.images[0]} 
          alt={course.title} 
          className={styles.image}
          fallbackText={course.title}
        />
        <div className={styles.carouselDots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{course.title}</h1>
        <p className={styles.address}>{course.address}</p>
        <p className={styles.spotsLeft}>Осталось {course.spotsLeft} свободных места</p>

        <div className={styles.description}>
          <p>{course.description}</p>
        </div>

        <div className={styles.consultationSection}>
          <h2 className={styles.sectionTitle}>Записаться на консультацию</h2>
          <p className={styles.sectionSubtitle}>Расскажем про направления и запишем на занятия</p>

          <div className={styles.calendarSection}>
            <div className={styles.calendar}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const date = new Date(CALENDAR_YEAR, CALENDAR_MONTH - 1, day)
                const dayOfWeek = date.getDay()
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                const unavailable = unavailableDates.includes(day)
                const selected = selectedDate === day.toString()

                return (
                  <button
                    key={day}
                    className={`${styles.calendarDay} ${
                      unavailable ? styles.unavailable : ''
                    } ${isWeekend ? styles.weekend : ''} ${
                      selected ? styles.selected : ''
                    }`}
                    onClick={() => !unavailable && setSelectedDate(day.toString())}
                    disabled={unavailable}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.timeSection}>
            <h3 className={styles.timeTitle}>Время:</h3>
            <div className={styles.timeSlots}>
              {availableTimes.map((time) => (
                <button
                  key={time}
                  className={`${styles.timeSlot} ${
                    selectedTime === time ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <button className={styles.bookButton} onClick={handleBook} disabled={isBooking}>
            {isBooking ? 'Отправляем...' : 'Забронировать'}
          </button>

          <div className={styles.checkboxes}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={agreedToDataProcessing}
                onChange={(e) => setAgreedToDataProcessing(e.target.checked)}
              />
              <span>
                Я согласен/согласна на обработку{' '}
                <u>персональных данных</u>
              </span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={wantReminder}
                onChange={(e) => setWantReminder(e.target.checked)}
              />
              <span>Я хочу получить напоминание о записи на почту</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
              />
              <span>Добавить событие в личный календарь</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
