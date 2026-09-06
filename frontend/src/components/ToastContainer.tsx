'use client'

import { useContext } from 'react'
import Toast from './Toast'
import styles from './ToastContainer.module.css'
import { ToastContext } from './ToastProvider'

export default function ToastContainer() {
  const toast = useContext(ToastContext)
  
  if (!toast) return null
  
  const { toasts, removeToast } = toast

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
