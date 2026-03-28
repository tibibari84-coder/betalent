import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import InboxThreadClient from './InboxThreadClient';

type Props = { params: { peerId: string } };

type PeerHint = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export default async function InboxThreadPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`/login?from=${encodeURIComponent(`/inbox/${params.peerId}`)}`);
  }

  const peerId = params.peerId?.trim();
  if (!peerId || peerId === session.user.id) {
    redirect('/inbox');
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });

  if (!peer) {
    redirect('/inbox');
  }

  const hint: PeerHint = {
    id: peer.id,
    username: peer.username,
    displayName: peer.displayName ?? peer.username,
    avatarUrl: peer.avatarUrl,
  };

  return <InboxThreadClient peerId={peer.id} peerHint={hint} />;
}
