/**
 * BETALENT Performance (video) Leaderboard – rank performances by weighted score.
 * Supports: global / country, daily / weekly / monthly / all_time.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import {
  PERFORMANCE_SCORE_WEIGHTS,
  LEADERBOARD_PERIOD_HOURS,
  type LeaderboardPeriod,
} from '@/constants/leaderboard-global';

export interface GetPerformanceLeaderboardInput {
  period?: LeaderboardPeriod;
  countryCode?: string | null;
  limit?: number;
  offset?: number;
  viewerUserId?: string | null;
}

export interface PerformanceLeaderboardEntry {
  rank: number;
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  creatorCountry: string | null;
  categoryName: string;
  categorySlug: string;
  score: number;
  talentScore: number | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  votesCount: number;
  coinsCount: number;
  sharesCount: number;
}

export interface GetPerformanceLeaderboardResult {
  entries: PerformanceLeaderboardEntry[];
  period: LeaderboardPeriod;
  countryCode: string | null;
}

const READY_WHERE = CANONICAL_PUBLIC_VIDEO_WHERE;

function computePerformanceScore(v: {
  talentScore: number | null;
  votesCount: number;
  coinsCount: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}): number {
  const talent = v.talentScore ?? 0;
  const w = PERFORMANCE_SCORE_WEIGHTS;
  return (
    w.talentScore * talent +
    w.votesCount * v.votesCount +
    w.supportCoins * v.coinsCount +
    w.viewsCount * v.viewsCount +
    w.likesCount * v.likesCount +
    w.commentsCount * v.commentsCount +
    w.sharesCount * v.sharesCount
  );
}

export async function getPerformanceLeaderboard(
  input: GetPerformanceLeaderboardInput = {}
): Promise<GetPerformanceLeaderboardResult> {
  const period = input.period ?? 'weekly';
  const countryCode = input.countryCode ?? null;
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = Math.max(0, input.offset ?? 0);

  const baseWhere: Prisma.VideoWhereInput = {
    AND: [
      READY_WHERE,
      videoDiscoveryVisibilityWhere(input.viewerUserId ?? null),
      ...(countryCode
        ? [{ creator: { country: { equals: countryCode.trim() } } } satisfies Prisma.VideoWhereInput]
        : []),
    ],
  };

  if (period === 'all_time') {
    const videos = await prisma.video.findMany({
      where: baseWhere,
      orderBy: [{ votesCount: 'desc' }, { viewsCount: 'desc' }, { createdAt: 'desc' }],
      take: limit * 3,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
          },
        },
        category: { select: { name: true, slug: true } },
      },
    });

    const scored = videos.map((v) => ({
      video: v,
      score: computePerformanceScore({
        talentScore: v.talentScore,
        votesCount: v.votesCount,
        coinsCount: v.coinsCount,
        viewsCount: v.viewsCount,
        likesCount: v.likesCount,
        commentsCount: v.commentsCount,
        sharesCount: v.sharesCount,
      }),
    }));
    scored.sort((a, b) => b.score - a.score);
    const page = scored.slice(offset, offset + limit);

    const entries: PerformanceLeaderboardEntry[] = page.map((s, i) => ({
      rank: offset + i + 1,
      videoId: s.video.id,
      title: s.video.title,
      thumbnailUrl: s.video.thumbnailUrl,
      videoUrl: s.video.videoUrl,
      creatorId: s.video.creator.id,
      creatorUsername: s.video.creator.username,
      creatorDisplayName: s.video.creator.displayName,
      creatorAvatarUrl: s.video.creator.avatarUrl,
      creatorCountry: s.video.creator.country,
      categoryName: s.video.category.name,
      categorySlug: s.video.category.slug,
      score: Math.round(s.score * 10) / 10,
      talentScore: s.video.talentScore,
      viewsCount: s.video.viewsCount,
      likesCount: s.video.likesCount,
      commentsCount: s.video.commentsCount,
      votesCount: s.video.votesCount,
      coinsCount: s.video.coinsCount,
      sharesCount: s.video.sharesCount,
    }));

    return { entries, period, countryCode };
  }

  const windowHours = LEADERBOARD_PERIOD_HOURS[period];
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const videos = await prisma.video.findMany({
    where: {
      AND: [...(baseWhere.AND as Prisma.VideoWhereInput[]), { createdAt: { gte: since } }],
    },
    orderBy: [{ votesCount: 'desc' }, { viewsCount: 'desc' }, { createdAt: 'desc' }],
    take: limit * 3,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
        },
      },
      category: { select: { name: true, slug: true } },
    },
  });

  const scored = videos.map((v) => ({
    video: v,
    score: computePerformanceScore({
      talentScore: v.talentScore,
      votesCount: v.votesCount,
      coinsCount: v.coinsCount,
      viewsCount: v.viewsCount,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount,
      sharesCount: v.sharesCount,
    }),
  }));
  scored.sort((a, b) => b.score - a.score);
  const page = scored.slice(offset, offset + limit);

  const entries: PerformanceLeaderboardEntry[] = page.map((s, i) => ({
    rank: offset + i + 1,
    videoId: s.video.id,
    title: s.video.title,
    thumbnailUrl: s.video.thumbnailUrl,
    videoUrl: s.video.videoUrl,
    creatorId: s.video.creator.id,
    creatorUsername: s.video.creator.username,
    creatorDisplayName: s.video.creator.displayName,
    creatorAvatarUrl: s.video.creator.avatarUrl,
    creatorCountry: s.video.creator.country,
    categoryName: s.video.category.name,
    categorySlug: s.video.category.slug,
    score: Math.round(s.score * 10) / 10,
    talentScore: s.video.talentScore,
    viewsCount: s.video.viewsCount,
    likesCount: s.video.likesCount,
    commentsCount: s.video.commentsCount,
    votesCount: s.video.votesCount,
    coinsCount: s.video.coinsCount,
    sharesCount: s.video.sharesCount,
  }));

  return { entries, period, countryCode };
}
