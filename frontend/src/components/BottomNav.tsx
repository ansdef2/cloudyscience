'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { APP_HOME } from '@/utils/navigation'
import styles from './BottomNav.module.css'

const ICONS = {
  home: (
    <path
      d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z"
      fill="currentColor"
    />
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" fill="currentColor" />
      <circle cx="16.5" cy="9.5" r="2.5" fill="currentColor" />
      <path d="M2.8 19c.5-3.3 3-5.2 6.2-5.2s5.7 1.9 6.2 5.2H2.8Z" fill="currentColor" />
      <path d="M16 19c-.2-1.8-.9-3.3-2-4.4.8-.4 1.6-.6 2.6-.6 2.4 0 4.3 1.5 4.7 5H16Z" fill="currentColor" />
    </>
  ),
  courses: (
    <>
      <rect x="6" y="3.5" width="13" height="17" rx="2.5" fill="currentColor" />
      <path d="M4 7.5h4M4 12h4M4 16.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.5 8.5h5M10.5 12h5" stroke="#0e0e16" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="10" r="3.2" fill="currentColor" />
      <path d="M6.5 18.2c1.2-2.2 3.2-3.4 5.5-3.4s4.3 1.2 5.5 3.4" fill="currentColor" />
    </>
  ),
}

const TABS = [
  { href: APP_HOME, label: 'Главная', icon: ICONS.home, match: (path: string) => path === APP_HOME },
  {
    href: '/people',
    label: 'Люди',
    icon: ICONS.people,
    match: (path: string) => ['/people', '/chats', '/teams'].some((prefix) => path.startsWith(prefix)),
  },
  { href: '/courses', label: 'Курсы', icon: ICONS.courses, match: (path: string) => path.startsWith('/course') },
  { href: '/profile', label: 'Профиль', icon: ICONS.profile, match: (path: string) => path.startsWith('/profile') },
]

/**
 * Нижняя панель на телефоне — как в макете: главная, люди, курсы, профиль.
 * На десктопе её роль играет шапка.
 */
export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className={styles.spacer} aria-hidden />
      <nav className={styles.nav} aria-label="Разделы">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${active ? styles.active : ''}`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                {tab.icon}
              </svg>
              <span className={styles.label}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
