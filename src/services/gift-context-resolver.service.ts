import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

export type ClientGiftContext = 'foryou' | 'challenge' | 'live';

/**
 * Server-authoritative gift context. Client hints are validated; cannot upgrade to challenge without proof.
 */
export async function resolveGiftContext(params: {
  videoId: string;
  clientContext: ClientGiftContext | null | undefined;
}): Promise<'FORYOU' | 'CHALLENGE' | 'LIVE'> {
  const { videoId, clientContext } = params;

  if (clientContext === 'live') {
    return 'LIVE';
  }

  if (clientContext !== 'challenge') {
    return 'FORYOU';
  }

  const video = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: {
      id: true,
      challengeEntries: {
        where: {
          challenge: {
            status: {
              in: [
                'ENTRY_OPEN',
                'ENTRY_CLOSED',
                'LIVE_UPCOMING',
                'LIVE_ACTIVE',
                'WINNERS_LOCKED',
                'ARCHIVED',
              ],
            },
          },
        },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (video && video.challengeEntries.length > 0) {
    return 'CHALLENGE';
  }

  return 'FORYOU';
}
