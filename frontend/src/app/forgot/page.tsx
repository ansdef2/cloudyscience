import type { Metadata } from 'next'
import ForgotPassword from '@/screens/ForgotPassword'

export const metadata: Metadata = { title: 'Сброс пароля — Облако науки', robots: { index: false } }

export default function Forgot() {
  return <ForgotPassword />
}
