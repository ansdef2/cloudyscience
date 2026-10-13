'use client'

import { useState } from 'react'
import { Booking } from '@/services/bookingService'
import { downloadUpload, formatSize } from '@/services/uploadService'
import { useToast } from '@/hooks/useToast'
import { ApiError } from '@/utils/api'
import { BOOKING_STATUS } from '@/utils/format'
import ui from '@/styles/ui.module.css'
import styles from './BookingCard.module.css'

interface BookingCardProps {
  booking: Booking
  /** Показать, кто оформил (брони команды) */
  showAuthor?: boolean
  onCancel?: (booking: Booking) => void
}

const STATUS_TONE: Record<string, string> = {
  confirmed: ui.badgeGreen,
  active: ui.badgeBlue,
  cancelled: ui.badgeRed,
}

/** Ссылки в тексте доступа делаем кликабельными, остальное — как есть */
export function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}

/** Бронь в списке: коротко — оборудование и время, по нажатию — файлы и доступ */
export default function BookingCard({ booking, showAuthor = false, onCancel }: BookingCardProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const files = booking.uploads ?? []

  const download = async (id: string, name: string) => {
    try {
      await downloadUpload(id, name)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось скачать файл')
    }
  }

  const when = `${new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${booking.time}`
  const extra = [
    booking.team ? `команда «${booking.team.name}»` : '',
    showAuthor && booking.user ? `оформил(а) ${booking.user.name}` : '',
  ].filter(Boolean)

  return (
    <div className={styles.booking}>
      <div className={`${styles.head} ${ui.cardWrap}`}>
        <div className={ui.cardBody}>
          <span className={ui.cardTitle}>{booking.equipment?.name ?? 'Оборудование'}</span>
          <span className={ui.cardMeta}>{[when, ...extra].join(' · ')}</span>
        </div>
        <div className={`${ui.cardActions} ${styles.actions}`}>
          <span className={`${ui.badge} ${STATUS_TONE[booking.status] ?? ''}`}>
            {BOOKING_STATUS[booking.status] ?? booking.status}
          </span>
          <button
            className={`${ui.ghost} ${ui.small}`}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            {open ? 'Скрыть' : 'Подробнее'}
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.details}>
          <dl className={styles.facts}>
            <dt>Формат</dt>
            <dd>{booking.rentalType === 'remote' ? 'Дистанционно' : 'Лично'}</dd>
            {booking.location && (
              <>
                <dt>Адрес</dt>
                <dd>{booking.location}</dd>
              </>
            )}
            {booking.notes && (
              <>
                <dt>Комментарий</dt>
                <dd>{booking.notes}</dd>
              </>
            )}
          </dl>

          {booking.rentalType === 'remote' && (
            <div className={styles.access}>
              <span className={styles.accessTitle}>Подключение к оборудованию</span>
              {booking.accessInfo ? (
                <p className={styles.accessText}>
                  <Linkified text={booking.accessInfo} />
                </p>
              ) : (
                <p className={ui.muted}>Администратор пришлёт данные для подключения после подтверждения брони</p>
              )}
            </div>
          )}

          {files.length > 0 && (
            <div className={styles.files}>
              <span className={styles.accessTitle}>Файлы</span>
              {files.map((file) => (
                <button key={file.id} className={styles.file} onClick={() => download(file.id, file.originalName)}>
                  <span className={styles.fileName}>{file.originalName}</span>
                  <span className={ui.muted}>{formatSize(file.size)} ↓</span>
                </button>
              ))}
            </div>
          )}

          {onCancel && (
            <button className={`${ui.danger} ${ui.small} ${styles.cancel}`} onClick={() => onCancel(booking)}>
              Отменить бронь
            </button>
          )}
        </div>
      )}
    </div>
  )
}
