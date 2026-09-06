'use client'

import styles from './ProtoCalendar.module.css'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

interface ProtoCalendarProps {
  /** Год и месяц (1-12) отображаемой сетки */
  year: number
  month: number
  /** Выбранная дата в формате YYYY-MM-DD */
  selected?: string | null
  onSelect: (isoDate: string) => void
  /** Номера дней, недоступных для записи */
  unavailable?: number[]
}

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export default function ProtoCalendar({
  year,
  month,
  selected,
  onSelect,
  unavailable = [],
}: ProtoCalendarProps) {
  const daysInMonth = new Date(year, month, 0).getDate()
  // getDay(): 0 — воскресенье, а сетка начинается с понедельника
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  return (
    <div className={styles.calendar}>
      <p className={styles.month}>
        {MONTHS[month - 1]} {year}
      </p>

      <div className={styles.grid}>
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7
          const isWeekend = weekday >= 5
          const isPast = isCurrentMonth && day < today.getDate()
          const isUnavailable = unavailable.includes(day) || isPast
          const isToday = isCurrentMonth && day === today.getDate()
          const isSelected = selected === iso(year, month, day)

          const classes = [
            styles.day,
            isWeekend && !isUnavailable ? styles.weekend : '',
            isUnavailable ? (isWeekend ? styles.unavailableWeekend : styles.unavailable) : '',
            isToday ? styles.today : '',
            isSelected ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={day}
              className={classes}
              disabled={isUnavailable}
              onClick={() => onSelect(iso(year, month, day))}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
