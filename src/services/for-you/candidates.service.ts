/**
 * For You V2 — Candidate Generation
 * Explicit buckets for ML-style ranking. Modular for future expansion.
 * Global buckets (retention, support, engagement, fresh, challenge, rising) are cached 60s.
 *
 * All buckets use {@link FOR_YOU_ELIGIBLE_VIDEO_WHERE} — only pipeline–public-ready videos.
 */

import { prisma } from '@/lib/prisma';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/feed-cache';
import { FOR_YOU_ELIGIBLE_VIDEO_WHERE } from '@/lib/for-you-pipeline';

const baseWhere = FOR_YOU_ELIGIBLE_VIDEO_WHERE;

const NEW_CREATOR_LIMIT = 3;
const EARLY_TEST_HOURS = 48;

export type CandidateBucket =
  | 'retention'
  | 'support'
  | 'engagement'
  | 'fresh'
  | 'challenge'
  | 'rising'
  | 'personalized'
  | 'exploration'
  /** Recent uploads with modest reach — widens pool beyond gift/engagement leaders. */
  | 'longtail'
  | 'fallback';

export interface CandidateWithBucket {
  videoId: string;
  bucket: CandidateBucket;
}

type RetentionRow = { videoId: string };
type VideoIdRow = { id: string };
type ChallengeRow = { videoId: string };
type RisingRow = { id: string; creator: { _count: { videos: number } } };

async function fetchRetention(): Promise<RetentionRow[]> {
  const key = 'candidates:retention';
  const cached = cacheGet<RetentionRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.videoWatchStats.findMany({
    where: { viewCount: { gte: 3 }, video: baseWhere },
    orderBy: [{ completedViewsCount: 'desc' }, { totalWatchSeconds: 'desc' }],
    take: 300,
    select: { videoId: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchSupport(): Promise<VideoIdRow[]> {
  const key = 'candidates:support';
  const cached = cacheGet<VideoIdRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.video.findMany({
    where: baseWhere,
    orderBy: { coinsCount: 'desc' },
    take: 400,
    select: { id: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchEngagement(): Promise<VideoIdRow[]> {
  const key = 'candidates:engagement';
  const cached = cacheGet<VideoIdRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.video.findMany({
    where: baseWhere,
    orderBy: [{ commentsCount: 'desc' }, { sharesCount: 'desc' }, { likesCount: 'desc' }],
    take: 400,
    select: { id: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchFresh(): Promise<VideoIdRow[]> {
  const key = 'candidates:fresh';
  const cached = cacheGet<VideoIdRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.video.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: { id: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchChallenge(now: Date): Promise<ChallengeRow[]> {
  const key = 'candidates:challenge';
  const cached = cacheGet<ChallengeRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.challengeEntry.findMany({
    where: {
      video: baseWhere,
      challenge: {
        status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE'] },
        startAt: { lte: now },
        endAt: { gte: now },
      },
    },
    take: 200,
    select: { videoId: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchRising(): Promise<RisingRow[]> {
  const key = 'candidates:rising';
  const cached = cacheGet<RisingRow[]>(key);
  if (cached) return cached;
  const rows = await prisma.video.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: { id: true, creator: { select: { _count: { select: { videos: true } } } } },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

async function fetchLongTail(): Promise<VideoIdRow[]> {
  const key = 'candidates:longtail';
  const cached = cacheGet<VideoIdRow[]>(key);
  if (cached) return cached;
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  const rows = await prisma.video.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: since },
      viewsCount: { lte: 2800 },
    },
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: { id: true },
  });
  cacheSet(key, rows, CACHE_TTL.CANDIDATE_BUCKET);
  return rows;
}

/**
 * Generate candidates from explicit buckets. Union and dedupe.
 */
export async function generateCandidates(params: {
  userId: string | null;
  preferredCategoryIds: Set<string>;
  preferredCreatorIds: Set<string>;
  preferredStyleSlugs: Set<string>;
  recentlyWatchedIds: Set<string>;
  now: Date;
}): Promise<CandidateWithBucket[]> {
  const { preferredCategoryIds, preferredCreatorIds, recentlyWatchedIds, now } = params;

  const excludeRecent = (id: string) => !recentlyWatchedIds.has(id);

  const [
    byRetention,
    bySupport,
    byEngagement,
    byFresh,
    byLongTail,
    byChallenge,
    byRising,
    byCategory,
    byCreator,
  ] = await Promise.all([
    fetchRetention(),
    fetchSupport(),
    fetchEngagement(),
    fetchFresh(),
    fetchLongTail(),
    fetchChallenge(now),
    fetchRising(),
    preferredCategoryIds.size > 0
      ? prisma.video.findMany({
          where: { ...baseWhere, categoryId: { in: Array.from(preferredCategoryIds) } },
          orderBy: { coinsCount: 'desc' },
          take: 200,
          select: { id: true },
        })
      : Promise.resolve([]),
    preferredCreatorIds.size > 0
      ? prisma.video.findMany({
          where: { ...baseWhere, creatorId: { in: Array.from(preferredCreatorIds) } },
          orderBy: { createdAt: 'desc' },
          take: 150,
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const result: CandidateWithBucket[] = [];

  const add = (id: string, bucket: CandidateBucket) => {
    if (excludeRecent(id) && !seen.has(id)) {
      seen.add(id);
      result.push({ videoId: id, bucket });
    }
  };

  for (const r of byRetention) {
    add(r.videoId, 'retention');
  }
  for (const v of bySupport) {
    add(v.id, 'support');
  }
  for (const v of byEngagement) {
    add(v.id, 'engagement');
  }
  for (const v of byFresh) {
    add(v.id, 'fresh');
  }
  for (const v of byLongTail) {
    add(v.id, 'longtail');
  }
  for (const e of byChallenge) {
    add(e.videoId, 'challenge');
  }
  for (const v of byRising) {
    if (v.creator._count.videos <= NEW_CREATOR_LIMIT) {
      add(v.id, 'rising');
    }
  }
  for (const v of byCategory) {
    add(v.id, 'personalized');
  }
  for (const v of byCreator) {
    add(v.id, 'personalized');
  }

  const explorationCategoryIds =
    preferredCategoryIds.size > 0
      ? (
          await prisma.category.findMany({
            where: { id: { notIn: Array.from(preferredCategoryIds) } },
            take: 20,
            select: { id: true },
          })
        ).map((c) => c.id)
      : [];
  if (explorationCategoryIds.length > 0) {
    const byExploration = await prisma.video.findMany({
      where: { ...baseWhere, categoryId: { in: explorationCategoryIds.slice(0, 20) } },
      orderBy: { coinsCount: 'desc' },
      take: 150,
      select: { id: true },
    });
    for (const v of byExploration) {
      add(v.id, 'exploration');
    }
  }

  return result;
}
