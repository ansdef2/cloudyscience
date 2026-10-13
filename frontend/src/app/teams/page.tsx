import { Suspense } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import TeamsPage from '@/screens/TeamsPage'

export default function Teams() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TeamsPage />
    </Suspense>
  )
}
