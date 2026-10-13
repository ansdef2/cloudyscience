'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from './BrandLogo'
import ProfileMenu from './ProfileMenu'
import ChatsLink from './ChatsLink'
import { APP_HOME } from '@/utils/navigation'
import styles from './SiteHeader.module.css'

/**
 * Шапка приложения для широких экранов: логотип, разделы и профиль.
 * На телефоне скрыта — там остаётся мобильная панель из макета.
 */
export default function SiteHeader() {
  const pathname = usePathname()

  const links = [
    { href: APP_HOME, label: 'Главная', active: pathname === APP_HOME },
    {
      href: '/equipment',
      label: 'Оборудование',
      active: pathname.startsWith('/equipment') || pathname.startsWith('/booking'),
    },
    { href: '/courses', label: 'Курсы', active: pathname.startsWith('/course') },
    {
      href: '/people',
      label: 'Люди',
      active: ['/people', '/chats', '/teams'].some((prefix) => pathname.startsWith(prefix)),
    },
    { href: '/search', label: 'Поиск', active: pathname.startsWith('/search') },
  ]

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href={APP_HOME} className={styles.logo} aria-label="Облако науки — главная">
            <BrandLogo height={30} />
          </Link>

          <nav className={styles.nav} aria-label="Разделы">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${link.active ? styles.active : ''}`}
                aria-current={link.active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.right}>
            <ChatsLink active={pathname.startsWith('/chats')} />
            <ProfileMenu />
          </div>
        </div>
      </header>
      <div className={styles.spacer} aria-hidden />
    </>
  )
}
