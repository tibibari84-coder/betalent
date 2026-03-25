import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { updateVideoTalentScore } from '@/services/talent-score.service';

export type SubmitTalentVoteResult =
  | {
      ok: true;
      userVote: number;
      votesCount: number;
      talentScore: number | null;
    }
  | {
      ok: false;
      code: 'VIDEO_NOT_FOUND' | 'VOTES_DISABLED';
    };

/**
 * Shared talent-vote write path used by both vote endpoints.
 * Canonical API is /api/vote; /api/videos/[id]/vote remains compatibility alias.
 */
export async function submitTalentVote(params: {
  userId: string;
  videoId: string;
  value: number;
}): Promise<SubmitTalentVoteResult> {
  const { userId, videoId, value } = params;
  const video = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: {
      id: true,
      creatorId: true,
      creator: { select: { allowVotesOnPerformances: true } },
    },
  });
  if (!video) {
    return { ok: false, code: 'VIDEO_NOT_FOUND' };
  }
  if (userId !== video.creatorId && !video.creator.allowVotesOnPerformances) {
    return { ok: false, code: 'VOTES_DISABLED' };
  }

  const existing = await prisma.vote.findUnique({
    where: { userId_videoId: { userId, videoId } },
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.vote.update({
        where: { id: existing.id },
        data: { value, updatedAt: new Date() },
      });
    } else {
      await tx.vote.create({
        data: { userId, videoId, value },
      });
      await tx.video.update({
        where: { id: videoId },
        data: { votesCount: { increment: 1 } },
      });
    }
  });

  await updateVideoTalentScore(videoId);

  const updated = await prisma.video.findUnique({
    where: { id: videoId },
    select: { votesCount: true, talentScore: true },
  });
  return {
    ok: true,
    userVote: value,
    votesCount: updated?.votesCount ?? 0,
    talentScore: updated?.talentScore ?? null,
  };
}
