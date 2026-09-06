import EquipmentDetail from '@/screens/EquipmentDetail'

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <EquipmentDetail equipmentId={id} />
}
