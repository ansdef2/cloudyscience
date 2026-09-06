'use client'

import { useState } from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
}

export default function SearchBar({ 
  placeholder = 'Поиск', 
  value: controlledValue,
  onChange,
  onSearch 
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('')
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (onChange) {
      onChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  const handleClear = () => {
    if (onChange) {
      onChange('')
    } else {
      setInternalValue('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(value)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.searchBar}>
      <span className={styles.searchIcon}>🔍</span>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
        >
          ✕
        </button>
      )}
    </form>
  )
}
