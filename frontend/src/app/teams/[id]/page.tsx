import TeamDetail from '@/screens/TeamDetail'

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <TeamDetail teamId={id} />
}
