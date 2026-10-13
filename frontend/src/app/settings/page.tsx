import type { Metadata } from 'next'
import SettingsPage from '@/screens/SettingsPage'

export const metadata: Metadata = { title: 'Настройки — Облако науки', robots: { index: false } }

export default function Settings() {
  return <SettingsPage />
}
