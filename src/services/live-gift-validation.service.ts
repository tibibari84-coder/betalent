import { prisma } from '@/lib/prisma';

/**
 * Validates that a live-session gift targets the active performer slot for the video.
 */
export async function assertLiveGiftEligible(params: {
  sessionId: string;
  videoId: string;
  receiverId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await prisma.liveChallengeSession.findUnique({
    where: { id: params.sessionId },
    select: { status: true, currentPerformerId: true },
  });
  if (!session) return { ok: false, message: 'Session not found' };
  if (session.status !== 'LIVE') return { ok: false, message: 'Session not live' };
  if (session.currentPerformerId !== params.receiverId) {
    return { ok: false, message: 'Not the current performer' };
  }
  const slot = await prisma.livePerformanceSlot.findFirst({
    where: {
      sessionId: params.sessionId,
      videoId: params.videoId,
      performerUserId: params.receiverId,
      status: 'LIVE',
    },
    select: { id: true },
  });
  if (!slot) return { ok: false, message: 'Performance slot not active for this video' };
  return { ok: true };
}
