// Утилита для работы с localStorage и sessionStorage

export const storage = {
  // localStorage
  local: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      if (typeof window === 'undefined') return defaultValue || null
      try {
        const item = window.localStorage.getItem(key)
        return item ? JSON.parse(item) : (defaultValue || null)
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error)
        return defaultValue || null
      }
    },
    set: <T>(key: string, value: T): void => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    remove: (key: string): void => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.removeItem(key)
      } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error)
      }
    },
    clear: (): void => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.clear()
      } catch (error) {
        console.error('Error clearing localStorage:', error)
      }
    },
  },
  // sessionStorage
  session: {
    get: <T>(key: string, defaultValue?: T): T | null => {
      if (typeof window === 'undefined') return defaultValue || null
      try {
        const item = window.sessionStorage.getItem(key)
        return item ? JSON.parse(item) : (defaultValue || null)
      } catch (error) {
        console.error(`Error reading sessionStorage key "${key}":`, error)
        return defaultValue || null
      }
    },
    set: <T>(key: string, value: T): void => {
      if (typeof window === 'undefined') return
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error)
      }
    },
    remove: (key: string): void => {
      if (typeof window === 'undefined') return
      try {
        window.sessionStorage.removeItem(key)
      } catch (error) {
        console.error(`Error removing sessionStorage key "${key}":`, error)
      }
    },
    clear: (): void => {
      if (typeof window === 'undefined') return
      try {
        window.sessionStorage.clear()
      } catch (error) {
        console.error('Error clearing sessionStorage:', error)
      }
    },
  },
}

// Ключи для хранения данных
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  SEARCH_HISTORY: 'search_history',
  SELECTED_FILES: 'selected_files',
  BOOKING_DRAFT: 'booking_draft',
} as const
