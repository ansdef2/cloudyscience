import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import ParentConsent from '@/screens/ParentConsent'

export const metadata: Metadata = { title: 'Согласие родителя — Облако науки', robots: { index: false } }

export default function Consent() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ParentConsent />
    </Suspense>
  )
}
