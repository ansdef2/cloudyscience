'use client'

import { useEffect } from 'react'
import { Toast as ToastType } from '@/hooks/useToast'
import styles from './Toast.module.css'

interface ToastProps {
  toast: ToastType
  onRemove: (id: string) => void
}

export default function Toast({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id, onRemove])

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.closeButton}
        onClick={() => onRemove(toast.id)}
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  )
}
