import BookingPage from '@/screens/BookingPage'

export default async function Booking({ params }: { params: Promise<{ equipmentId: string }> }) {
  const { equipmentId } = await params

  return <BookingPage equipmentId={equipmentId} />
}
