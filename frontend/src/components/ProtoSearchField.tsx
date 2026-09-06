'use client'

import styles from './ProtoSearchField.module.css'

interface ProtoSearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function ProtoSearchField({
  value,
  onChange,
  placeholder = 'Поиск',
  autoFocus = false,
}: ProtoSearchFieldProps) {
  return (
    <div className={styles.field}>
      <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
      />
    </div>
  )
}
