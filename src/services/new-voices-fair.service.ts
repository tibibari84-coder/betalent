/**
 * New Voices — fair discovery ordering (not raw chronological).
 *
 * Stages: eligibility (canonical public + discovery visibility + trust/moderation) →
 * candidate pool → explicit score (freshness + engagement rates + underexposed boost + mega dampen) →
 * creator-capped assembly with adjacent diversity.
 *
 * Personalization: none (global “new voices” lane). Honest degradation to quality/fairness ranking.
 */

import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isUntrustedActor } from '@/lib/actor-trust';
import {
  NEW_VOICES_CANDIDATE_POOL,
  NEW_VOICES_MAX_PER_CREATOR_IN_WINDOW,
} from '@/constants/ranking';
import {
  assembleWithCreatorDiversity,
  megaCreatorScoreMultiplier,
  underexposedDiscoveryMultiplier,
} from '@/services/fair-discovery.service';

export async function getNewVoicesFairVideoIds(params: {
  viewerUserId: string | null;
  limit: number;
  cursorVideoId: string | null;
}): Promise<string[]> {
  const { viewerUserId, limit, cursorVideoId } = params;

  const cursorRow = cursorVideoId
    ? await prisma.video.findUnique({
        where: { id: cursorVideoId },
        select: { createdAt: true },
      })
    : null;
  const cursorWhere = cursorRow ? { createdAt: { lt: cursorRow.createdAt } as const } : {};

  const discoverWhere = {
    AND: [CANONICAL_PUBLIC_VIDEO_WHERE, videoDiscoveryVisibilityWhere(viewerUserId)],
  };

  const rows = await prisma.video.findMany({
    where: {
      ...discoverWhere,
      videoUrl: { not: null },
      ...cursorWhere,
    },
    orderBy: { createdAt: 'desc' },
    take: NEW_VOICES_CANDIDATE_POOL,
    select: {
      id: true,
      createdAt: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      votesCount: true,
      creatorId: true,
      creator: {
        select: {
          email: true,
          isTestAccount: true,
          isSeedAccount: true,
          followersCount: true,
          createdAt: true,
          moderationStatus: true,
          _count: { select: { videos: true } },
        },
      },
    },
  });

  const now = Date.now();
  type Row = (typeof rows)[number];
  const scored: Array<Row & { score: number }> = [];

  for (const v of rows) {
    const c = v.creator;
    if (!c) continue;
    if (isUntrustedActor(c)) continue;
    if (
      c.moderationStatus === 'SUSPENDED' ||
      c.moderationStatus === 'BANNED' ||
      c.moderationStatus === 'LIMITED'
    ) {
      continue;
    }

    const ageHours = (now - v.createdAt.getTime()) / 3600000;
    const freshness = Math.exp(-ageHours / 96) * 42;
    const engagementRatio = (v.likesCount + v.commentsCount * 2) / Math.max(1, v.viewsCount);
    const engagement = Math.min(28, engagementRatio * 600 + Math.min(v.votesCount, 80) * 0.12);
    /** Quality floor: very cold videos with zero engagement stay eligible but sink; not random junk promotion. */
    const qualityFloor = engagementRatio >= 0.0008 || v.viewsCount < 400 ? 1 : 0.62;
    let score = (freshness + engagement) * qualityFloor;
    score *= megaCreatorScoreMultiplier(c.followersCount ?? 0);
    score *= underexposedDiscoveryMultiplier(v.viewsCount, c.followersCount ?? 0);
    const accountAgeDays = (now - c.createdAt.getTime()) / 86400000;
    if (accountAgeDays < 90 && c._count.videos <= 5) score *= 1.07;
    scored.push({ ...v, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const diversified = assembleWithCreatorDiversity(
    scored.map((s) => ({ id: s.id, creatorId: s.creatorId })),
    limit,
    { maxPerCreator: NEW_VOICES_MAX_PER_CREATOR_IN_WINDOW, avoidAdjacentSameCreator: true }
  );

  const ids = diversified.map((d) => d.id);
  if (ids.length >= limit) return ids;

  const seen = new Set(ids);
  for (const s of scored) {
    if (ids.length >= limit) break;
    if (!seen.has(s.id)) {
      ids.push(s.id);
      seen.add(s.id);
    }
  }
  return ids.slice(0, limit);
}
