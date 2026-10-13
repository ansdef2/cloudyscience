'use client'

import { useEffect, useState } from 'react'
import { REPORT_REASONS, ReportReason, sendReport } from '@/services/safetyService'
import { useToast } from '@/hooks/useToast'
import { ApiError } from '@/utils/api'
import ui from '@/styles/ui.module.css'
import styles from './ReportDialog.module.css'

interface ReportDialogProps {
  /** На кого жалоба — человек или конкретное сообщение */
  target: { userId?: string; messageId?: string; label: string }
  onClose: () => void
}

/** Жалоба администратору: причина и комментарий */
export default function ReportDialog({ target, onClose }: ReportDialogProps) {
  const toast = useToast()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reason) return
    setSending(true)
    try {
      const result = await sendReport({
        userId: target.userId,
        messageId: target.messageId,
        reason,
        comment: comment.trim() || undefined,
      })
      toast.success(result.message)
      onClose()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось отправить жалобу')
      setSending(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={`${ui.panel} ${styles.dialog}`}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Жалоба"
      >
        <h2 className={styles.title}>Пожаловаться</h2>
        <p className={styles.target}>{target.label}</p>

        <div className={styles.reasons} role="radiogroup" aria-label="Причина">
          {REPORT_REASONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={reason === item.id}
              className={`${styles.reason} ${reason === item.id ? styles.reasonActive : ''}`}
              onClick={() => setReason(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <textarea
          className={ui.textarea}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Что случилось? Необязательно"
          maxLength={2000}
        />
        <p className={styles.hint}>
          Жалобу увидит только администратор. Если вам угрожают или вы в опасности — расскажите взрослым и
          звоните 112.
        </p>

        <div className={styles.actions}>
          <button className={ui.ghost} type="button" onClick={onClose}>
            Отмена
          </button>
          <button className={ui.primary} type="submit" disabled={!reason || sending}>
            {sending ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </form>
    </div>
  )
}
