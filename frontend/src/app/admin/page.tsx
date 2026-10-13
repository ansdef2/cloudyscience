import { Suspense } from 'react'
import LoadingScreen from '@/components/LoadingScreen'
import AdminPage from '@/screens/AdminPage'

export default function Admin() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AdminPage />
    </Suspense>
  )
}
