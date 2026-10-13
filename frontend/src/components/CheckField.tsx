'use client'

import { ReactNode } from 'react'
import styles from '@/screens/Auth.module.css'

interface CheckFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  hint?: ReactNode
  disabled?: boolean
  name?: string
  required?: boolean
}

/** Настоящий чекбокс, нарисованный в стиле макета (как «Запомнить меня») */
export default function CheckField({ checked, onChange, children, hint, disabled, name, required }: CheckFieldProps) {
  return (
    <label className={styles.remember}>
      <input
        className={styles.rememberInput}
        type="checkbox"
        name={name}
        checked={checked}
        required={required}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span className={styles.rememberBox} aria-hidden>
        <svg viewBox="0 0 14 14" fill="none">
          <path d="m2 7.5 3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={styles.rememberText}>
        <span>{children}</span>
        {hint && <span className={styles.rememberHint}>{hint}</span>}
      </span>
    </label>
  )
}
