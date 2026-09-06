import BookingPage from '@/screens/BookingPage'

export default function Booking({ params }: { params: { equipmentId: string } }) {
  return <BookingPage equipmentId={params.equipmentId} />
}
