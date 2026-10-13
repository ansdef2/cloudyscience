import { Suspense } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import PeoplePage from '@/screens/PeoplePage'

export default function People() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PeoplePage />
    </Suspense>
  )
}
