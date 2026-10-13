'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { acceptPolicy } from '@/services/accountService'
import { ApiError } from '@/utils/api'
import styles from './AccountNotice.module.css'

/** На этих страницах просьба принять документы мешала бы их читать */
const QUIET_PATHS = ['/privacy', '/terms', '/consent', '/reset']

/**
 * Аккаунты, созданные до появления согласий, ещё не приняли политику.
 * Просим один раз — плашкой поверх страницы, пока не примут.
 */
export default function AccountNotice() {
  const toast = useToast()
  const pathname = usePathname()
  const { user, setUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const visible = !!user && !user.consentAt && !QUIET_PATHS.some((path) => pathname?.startsWith(path))

  // Пока плашка видна, низ страницы не должен прятаться под ней
  useEffect(() => {
    if (!visible) return
    document.body.style.paddingBottom = '200px'
    return () => {
      document.body.style.paddingBottom = ''
    }
  }, [visible])

  if (!visible) return null

  const accept = async () => {
    setSaving(true)
    try {
      setUser(await acceptPolicy())
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.notice} role="dialog" aria-live="polite" aria-label="Согласие с документами">
      <p className={styles.text}>
        Мы опубликовали{' '}
        <Link href="/terms" className={styles.link}>
          пользовательское соглашение
        </Link>{' '}
        и{' '}
        <Link href="/privacy" className={styles.link}>
          политику конфиденциальности
        </Link>
        . Чтобы продолжить пользоваться платформой, подтвердите согласие с ними.
      </p>
      <button className={styles.button} onClick={accept} disabled={saving}>
        {saving ? 'Сохраняем...' : 'Принимаю'}
      </button>
    </div>
  )
}
