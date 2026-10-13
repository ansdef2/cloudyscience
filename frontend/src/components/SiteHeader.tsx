'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from './BrandLogo'
import ProfileMenu from './ProfileMenu'
import { Course } from '@/models/Api'
import { api } from '@/utils/api'
import { APP_HOME } from '@/utils/navigation'
import styles from './SiteHeader.module.css'

/** Курс на платформе один — ссылку на него узнаём один раз за сессию */
let courseHrefPromise: Promise<string | null> | null = null
const loadCourseHref = () => {
  courseHrefPromise ??= api
    .get<Course[]>('/courses')
    .then((response) => (response.data[0] ? `/course/${response.data[0].id}` : null))
    .catch(() => null)
  return courseHrefPromise
}

/**
 * Шапка приложения для широких экранов: логотип, разделы и профиль.
 * На телефоне скрыта — там остаётся мобильная панель из макета.
 */
export default function SiteHeader() {
  const pathname = usePathname()
  const [courseHref, setCourseHref] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadCourseHref().then((href) => {
      if (!cancelled) setCourseHref(href)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const links = [
    { href: APP_HOME, label: 'Главная', active: pathname === APP_HOME },
    {
      href: '/equipment',
      label: 'Оборудование',
      active: pathname.startsWith('/equipment') || pathname.startsWith('/booking'),
    },
    ...(courseHref
      ? [{ href: courseHref, label: 'Курс', active: pathname.startsWith('/course') }]
      : []),
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

          <ProfileMenu />
        </div>
      </header>
      <div className={styles.spacer} aria-hidden />
    </>
  )
}
