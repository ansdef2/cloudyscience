'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { User } from '@/models/Api'
import { loginPathFromHere } from '@/utils/navigation'
import ui from '@/styles/ui.module.css'

interface AuthGateProps {
  /** Что показать гостю вместо содержимого */
  reason: string
  adminOnly?: boolean
  children: (user: User) => ReactNode
}

/** Раздел только для вошедших: гостю — объяснение и кнопка входа */
export default function AuthGate({ reason, adminOnly = false, children }: AuthGateProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  if (loading) return <div className="bigLoader" style={{ marginTop: 40 }} />

  if (!user) {
    return (
      <div className={ui.empty}>
        <p style={{ marginBottom: 14 }}>{reason}</p>
        <button className={ui.primary} onClick={() => router.push(loginPathFromHere())}>
          Войти
        </button>
      </div>
    )
  }

  if (adminOnly && user.role !== 'admin') {
    return <div className={ui.empty}>Раздел доступен только администратору</div>
  }

  return <>{children(user)}</>
}
