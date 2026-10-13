import { notFound } from 'next/navigation'
import ChatRoom from '@/screens/ChatRoom'

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>
}) {
  const { kind, id } = await params
  if (kind !== 'user' && kind !== 'team') notFound()

  return <ChatRoom kind={kind} id={id} />
}
