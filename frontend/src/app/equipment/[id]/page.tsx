import EquipmentDetail from '@/screens/EquipmentDetail'

export default function EquipmentDetailPage({ params }: { params: { id: string } }) {
  return <EquipmentDetail equipmentId={params.id} />
}
