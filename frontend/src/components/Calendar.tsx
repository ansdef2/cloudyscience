'use client'

import { useState } from 'react'
import styles from './Calendar.module.css'

interface CalendarProps {
  year: number
  month: number
  selectedDate?: string | null
  onDateSelect?: (date: string) => void
  unavailableDates?: number[]
}

export default function Calendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  unavailableDates = [],
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(month)
  const [currentYear, setCurrentYear] = useState(year)

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay()
  
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const handleDateClick = (day: number) => {
    if (unavailableDates.includes(day)) return
    const dateStr = `${day}`
    if (onDateSelect) {
      onDateSelect(dateStr)
    }
  }

  const isUnavailable = (day: number) => unavailableDates.includes(day)
  const isWeekend = (day: number) => {
    const date = new Date(currentYear, currentMonth - 1, day)
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <h3 className={styles.monthTitle}>
          {monthNames[currentMonth - 1]} {currentYear}
        </h3>
      </div>
      
      <div className={styles.weekDays}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.days}>
        {Array.from({ length: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className={styles.emptyDay}></div>
        ))}
        
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const unavailable = isUnavailable(day)
          const weekend = isWeekend(day)
          const selected = selectedDate === day.toString()

          return (
            <button
              key={day}
              className={`${styles.day} ${
                unavailable ? styles.unavailable : ''
              } ${weekend ? styles.weekend : ''} ${
                selected ? styles.selected : ''
              }`}
              onClick={() => handleDateClick(day)}
              disabled={unavailable}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
