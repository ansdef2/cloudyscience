import InstitutionDetail from '@/screens/InstitutionDetail'

export default async function InstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <InstitutionDetail institutionId={id} />
}
