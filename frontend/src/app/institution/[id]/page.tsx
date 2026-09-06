import InstitutionDetail from '@/screens/InstitutionDetail'

export default function InstitutionPage({ params }: { params: { id: string } }) {
  return <InstitutionDetail institutionId={params.id} />
}
