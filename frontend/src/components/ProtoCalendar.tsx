'use client'

import styles from './ProtoCalendar.module.css'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface ProtoCalendarProps {
  /** Год и месяц (1-12) отображаемой сетки */
  year: number
  month: number
  /** Выбранная дата в формате YYYY-MM-DD */
  selected?: string | null
  onSelect: (isoDate: string) => void
  /** Первый и последний доступный день, YYYY-MM-DD */
  minDate?: string
  maxDate?: string
  /** Переключение месяца; без него стрелок нет */
  onMonthChange?: (year: number, month: number) => void
}

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const localToday = () => {
  const now = new Date()
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

const shift = (year: number, month: number, delta: number) => {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export default function ProtoCalendar({
  year,
  month,
  selected,
  onSelect,
  minDate = localToday(),
  maxDate,
  onMonthChange,
}: ProtoCalendarProps) {
  const daysInMonth = new Date(year, month, 0).getDate()
  // getDay(): 0 — воскресенье, а сетка начинается с понедельника
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7

  const monthKey = iso(year, month, 1).slice(0, 7)
  const canPrev = monthKey > minDate.slice(0, 7)
  const canNext = !maxDate || monthKey < maxDate.slice(0, 7)

  const go = (delta: number) => {
    const next = shift(year, month, delta)
    onMonthChange?.(next.year, next.month)
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.head}>
        {onMonthChange && (
          <button
            type="button"
            className={styles.nav}
            onClick={() => go(-1)}
            disabled={!canPrev}
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
        )}
        <p className={styles.month} aria-live="polite">
          {MONTHS[month - 1]} {year}
        </p>
        {onMonthChange && (
          <button
            type="button"
            className={styles.nav}
            onClick={() => go(1)}
            disabled={!canNext}
            aria-label="Следующий месяц"
          >
            ›
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((name, index) => (
          <span key={name} className={`${styles.weekday} ${index >= 5 ? styles.weekend : ''}`}>
            {name}
          </span>
        ))}

        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = iso(year, month, day)
          const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7
          const isWeekend = weekday >= 5
          const isUnavailable = date < minDate || (!!maxDate && date > maxDate)
          const isToday = date === localToday()
          const isSelected = selected === date

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
              type="button"
              key={day}
              className={classes}
              disabled={isUnavailable}
              aria-pressed={isSelected}
              aria-label={`${day} ${MONTHS[month - 1].toLowerCase()}`}
              onClick={() => onSelect(date)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
