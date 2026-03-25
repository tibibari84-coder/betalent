/**
 * BETALENT creator leaderboard – rank creators by influence score.
 * See: docs/CREATOR-LEADERBOARD-DESIGN.md, constants/creator-leaderboard.ts
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import {
  CREATOR_DEFAULT_COMPLETION_RATE,
  CREATOR_LEADERBOARD_DEFAULT_LIMIT,
  CREATOR_LEADERBOARD_MAX_LIMIT,
  CREATOR_SCORE_WEIGHTS,
  CREATOR_LEADERBOARD_WINDOW_HOURS,
  type CreatorLeaderboardType,
} from '@/constants/creator-leaderboard';

export interface GetCreatorLeaderboardInput {
  type?: CreatorLeaderboardType;
  categoryId?: string | null;
  categorySlug?: string | null;
  /** ISO 3166-1 alpha-2; when set, only creators from this country are ranked. */
  countryCode?: string | null;
  limit?: number;
  offset?: number;
  /** Discovery: only aggregate videos the viewer may see (profile visibility). */
  viewerUserId?: string | null;
}

export interface CreatorLeaderboardEntry {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  isVerified: boolean;
  score: number;
}

export interface GetCreatorLeaderboardResult {
  entries: CreatorLeaderboardEntry[];
  type: CreatorLeaderboardType;
  categoryId: string | null;
  categorySlug: string | null;
}

function completionProxy(
  totalLikes: number,
  totalComments: number,
  totalViews: number
): number {
  if (totalViews <= 0) return CREATOR_DEFAULT_COMPLETION_RATE;
  const ratio = (totalLikes + totalComments) / totalViews;
  return Math.min(1, ratio * 5);
}

/**
 * Get ranked creator leaderboard by type (daily / weekly / monthly / all-time) and optional category.
 * Semantics are unified across periods: same score formula, different time window.
 */
export async function getCreatorLeaderboard(
  input: GetCreatorLeaderboardInput = {}
): Promise<GetCreatorLeaderboardResult> {
  const type = input.type ?? 'weekly';
  const limit = Math.min(
    input.limit ?? CREATOR_LEADERBOARD_DEFAULT_LIMIT,
    CREATOR_LEADERBOARD_MAX_LIMIT
  );
  const offset = Math.max(0, input.offset ?? 0);

  let categoryId: string | null = input.categoryId ?? null;
  const categorySlug = input.categorySlug ?? null;
  if (categorySlug && !categoryId) {
    const cat = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    categoryId = cat?.id ?? null;
  }

  const videoWhere: Prisma.VideoWhereInput = {
    AND: [
      CANONICAL_PUBLIC_VIDEO_WHERE,
      videoDiscoveryVisibilityWhere(input.viewerUserId ?? null),
      ...(categoryId ? [{ categoryId } satisfies Prisma.VideoWhereInput] : []),
    ],
  };
  const countryCode = input.countryCode ?? null;

  const since = type === 'alltime'
    ? null
    : new Date(Date.now() - CREATOR_LEADERBOARD_WINDOW_HOURS[type] * 60 * 60 * 1000);
  return getLeaderboardByVideoAggregate({
    since,
    videoWhere,
    categoryId,
    categorySlug,
    countryCode,
    limit,
    offset,
    type,
  });
}

async function getLeaderboardByVideoAggregate(params: {
  since: Date | null;
  videoWhere: Prisma.VideoWhereInput;
  categoryId: string | null;
  categorySlug: string | null;
  countryCode: string | null;
  limit: number;
  offset: number;
  type: CreatorLeaderboardType;
}): Promise<GetCreatorLeaderboardResult> {
  const { since, videoWhere, categoryId, categorySlug, countryCode, limit, offset, type } =
    params;

  const aggregateWhere = since
    ? { ...videoWhere, createdAt: { gte: since } }
    : videoWhere;

  const creatorAgg = await prisma.video.groupBy({
    by: ['creatorId'],
    where: aggregateWhere,
    _sum: {
      score: true,
      sharesCount: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
    },
  });

  const aggByCreator = new Map(
    creatorAgg.map((v) => [
      v.creatorId,
      {
        votes: v._sum.score ?? 0,
        shares: v._sum.sharesCount ?? 0,
        likes: v._sum.likesCount ?? 0,
        comments: v._sum.commentsCount ?? 0,
        views: v._sum.viewsCount ?? 0,
      },
    ])
  );
  let creatorIds = Array.from(aggByCreator.keys());
  if (creatorIds.length === 0) {
    return { entries: [], type, categoryId, categorySlug };
  }

  const creators = await prisma.user.findMany({
    where: {
      id: { in: creatorIds },
      ...(countryCode
        ? { country: { equals: countryCode.trim(), mode: 'insensitive' } }
        : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      country: true,
      isVerified: true,
      followersCount: true,
    },
  });

  const scored = creators.map((u) => {
    const agg = aggByCreator.get(u.id) ?? {
      votes: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      views: 0,
    };
    const totalVotes = agg.votes;
    const totalLikes = agg.likes;
    const totalShares = agg.shares;
    const followers = u.followersCount;
    const completion = completionProxy(agg.likes, agg.comments, agg.views);

    const score =
      CREATOR_SCORE_WEIGHTS.totalVotes * totalVotes +
      CREATOR_SCORE_WEIGHTS.totalLikes * totalLikes +
      CREATOR_SCORE_WEIGHTS.totalShares * totalShares +
      CREATOR_SCORE_WEIGHTS.followers * followers +
      CREATOR_SCORE_WEIGHTS.videoCompletionRate * completion;

    return { user: u, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const page = scored.slice(offset, offset + limit);

  const entries: CreatorLeaderboardEntry[] = page.map((s, i) => ({
    rank: offset + i + 1,
    creatorId: s.user.id,
    username: s.user.username,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    country: s.user.country,
    isVerified: s.user.isVerified,
    score: Math.round(s.score),
  }));

  return { entries, type, categoryId, categorySlug };
}
