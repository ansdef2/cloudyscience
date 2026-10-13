import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import ResetPassword from '@/screens/ResetPassword'

export const metadata: Metadata = { title: 'Новый пароль — Облако науки', robots: { index: false } }

export default function Reset() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResetPassword />
    </Suspense>
  )
}
