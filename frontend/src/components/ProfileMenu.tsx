'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useAuth } from '@/hooks/useAuth'
import { fileUrl } from '@/services/uploadService'
import { loginPathFromHere } from '@/utils/navigation'
import styles from './ProfileMenu.module.css'

type OpenPanel = 'none' | 'profile' | 'bell'

const MENU = [
  { href: '/profile', label: 'Профиль' },
  { href: '/chats', label: 'Чаты' },
  { href: '/teams', label: 'Команды' },
  { href: '/settings', label: 'Настройки' },
  { href: '/admin', label: 'Админка', adminOnly: true },
]

/**
 * Колокольчик и аватар в шапке. До этого оба были декоративными:
 * клик по ним не делал ничего, и это выглядело как поломка.
 */
export default function ProfileMenu() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [panel, setPanel] = useState<OpenPanel>('none')
  const rootRef = useRef<HTMLDivElement>(null)

  // Клик мимо меню и Escape закрывают его
  useEffect(() => {
    if (panel === 'none') return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanel('none')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel('none')
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [panel])

  const toggle = (next: OpenPanel) => setPanel((current) => (current === next ? 'none' : next))

  const handleAvatarClick = () => {
    // Пока профиль не загружен, вошедший выглядит как гость:
    // клик в этот момент увёл бы его на страницу входа
    if (loading) return

    // Гостя незачем водить по пустому меню — сразу на вход
    if (!isAuthenticated) {
      router.push(loginPathFromHere())
      return
    }
    toggle('profile')
  }

  const handleLogout = () => {
    logout()
    setPanel('none')
    // После выхода — на лендинг, там кнопка входа
    router.push('/')
  }

  return (
    <div className={styles.actions} ref={rootRef}>
      <button
        className={styles.iconButton}
        type="button"
        aria-label="Уведомления"
        aria-expanded={panel === 'bell'}
        onClick={() => toggle('bell')}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        className={styles.avatarButton}
        type="button"
        aria-label={isAuthenticated ? 'Меню профиля' : 'Войти'}
        disabled={loading}
        aria-expanded={panel === 'profile'}
        onClick={handleAvatarClick}
      >
        {isAuthenticated && user?.avatar ? (
          <ImageWithFallback src={fileUrl(user.avatar)!} alt={user.name} className={styles.avatar} bare />
        ) : isAuthenticated ? (
          <span className={styles.avatarFallback}>
            {user?.name?.trim().charAt(0).toUpperCase() || '?'}
          </span>
        ) : (
          <ImageWithFallback src="/prototype/profile.jpg" alt="Войти" className={styles.avatar} bare />
        )}
      </button>

      {panel === 'bell' && (
        <div className={styles.popover}>
          <p className={styles.empty}>Уведомлений пока нет</p>
        </div>
      )}

      {panel === 'profile' && (
        <div className={styles.popover}>
          <p className={styles.name}>{user?.name}</p>
          <p className={styles.email}>{user?.email}</p>
          <div className={styles.divider} />
          {MENU.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
            <button
              key={item.href}
              className={styles.action}
              type="button"
              onClick={() => {
                setPanel('none')
                router.push(item.href)
              }}
            >
              {item.label}
            </button>
          ))}
          <div className={styles.divider} />
          <button className={styles.action} type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
