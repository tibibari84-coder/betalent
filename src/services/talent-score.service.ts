/**
 * Talent Score: calculate and persist score for a video.
 * score = avgVote*0.6 + likeWeight*0.2 + commentWeight*0.1 + watchWeight*0.1
 * Stored on Video.talentScore; only set when votesCount >= 5.
 */

import { prisma } from '@/lib/prisma';
import {
  TALENT_SCORE_MIN_VOTES,
  TALENT_SCORE_WEIGHTS,
  TALENT_SCORE_LIKES_SCALE,
  TALENT_SCORE_COMMENTS_SCALE,
  TALENT_SCORE_VIEWS_SCALE,
  normalizeToTen,
} from '@/constants/talent-score';

export function calculateTalentScore(params: {
  avgVote: number;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
}): number {
  const likeWeight = normalizeToTen(params.likesCount, TALENT_SCORE_LIKES_SCALE);
  const commentWeight = normalizeToTen(params.commentsCount, TALENT_SCORE_COMMENTS_SCALE);
  const watchWeight = normalizeToTen(params.viewsCount, TALENT_SCORE_VIEWS_SCALE);
  const raw =
    params.avgVote * TALENT_SCORE_WEIGHTS.avgVote +
    likeWeight * TALENT_SCORE_WEIGHTS.likeWeight +
    commentWeight * TALENT_SCORE_WEIGHTS.commentWeight +
    watchWeight * TALENT_SCORE_WEIGHTS.watchWeight;
  return Math.round(raw * 10) / 10;
}

/**
 * Recompute and persist talent score for a video. Call after votes/likes/comments/views change.
 * Sets talentScore only when votesCount >= TALENT_SCORE_MIN_VOTES; otherwise null.
 */
export async function updateVideoTalentScore(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      votesCount: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
    },
  });
  if (!video) return;

  let talentScore: number | null = null;
  if (video.votesCount >= TALENT_SCORE_MIN_VOTES) {
    const agg = await prisma.vote.aggregate({
      where: { videoId },
      _avg: { value: true },
    });
    const avgVote = agg._avg.value ?? 0;
    talentScore = calculateTalentScore({
      avgVote,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      viewsCount: video.viewsCount,
    });
  }

  await prisma.video.update({
    where: { id: videoId },
    data: { talentScore },
  });
}
