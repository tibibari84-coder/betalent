/**
 * BETALENT challenge star-vote service.
 * Scoped to challenges only; not used in main For You feed.
 * Anti-abuse: self-vote blocked, rate limit, one vote per user per entry.
 */

import { prisma } from '@/lib/prisma';
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/feed-cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordFraudEvent } from '@/services/fraud-risk.service';
import {
  CHALLENGE_VOTE_PRIOR_MEAN,
  CHALLENGE_VOTE_PRIOR_WEIGHT,
  CHALLENGE_VOTE_RATE_LIMIT_PER_HOUR,
  CHALLENGE_VOTE_STARS_MAX,
  CHALLENGE_VOTE_STARS_MIN,
} from '@/constants/challenge-vote';
import { CHALLENGE_STATUS_VOTING_OPEN } from '@/constants/challenge';

export type VoteResult =
  | { ok: true; updated: boolean }
  | {
      ok: false;
      code:
        | 'CHALLENGE_NOT_FOUND'
        | 'ENTRY_NOT_FOUND'
        | 'SELF_VOTE'
        | 'INVALID_STARS'
        | 'RATE_LIMIT'
        | 'UNAUTHORIZED'
        | 'VOTING_CLOSED'
        | 'VOTES_DISABLED';
    };

/**
 * Submit or update a star vote for a challenge entry.
 * Idempotent: same user + entry = update existing vote.
 */
export async function submitChallengeVote(params: {
  challengeId: string;
  videoId: string;
  voterUserId: string;
  stars: number;
  ip?: string;
}): Promise<VoteResult> {
  const { challengeId, videoId, voterUserId, stars } = params;

  if (stars < CHALLENGE_VOTE_STARS_MIN || stars > CHALLENGE_VOTE_STARS_MAX) {
    return { ok: false, code: 'INVALID_STARS' };
  }

  if (!(await checkRateLimit('challenge-vote', voterUserId, CHALLENGE_VOTE_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000))) {
    return { ok: false, code: 'RATE_LIMIT' };
  }

  const [challenge, entry] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, status: true, votingCloseAt: true, endAt: true },
    }),
    prisma.challengeEntry.findFirst({
      where: { challengeId, videoId, status: 'ACTIVE' },
      select: { creatorId: true },
    }),
  ]);

  if (!challenge) return { ok: false, code: 'CHALLENGE_NOT_FOUND' };
  if (!CHALLENGE_STATUS_VOTING_OPEN.includes(challenge.status)) return { ok: false, code: 'VOTING_CLOSED' };
  const voteDeadline = challenge.votingCloseAt ?? challenge.endAt;
  if (voteDeadline && new Date() > new Date(voteDeadline)) return { ok: false, code: 'VOTING_CLOSED' };
  if (!entry) return { ok: false, code: 'ENTRY_NOT_FOUND' };
  const creatorRow = await prisma.user.findUnique({
    where: { id: entry.creatorId },
    select: { allowVotesOnPerformances: true },
  });
  if (creatorRow && !creatorRow.allowVotesOnPerformances) {
    return { ok: false, code: 'VOTES_DISABLED' };
  }
  if (entry.creatorId === voterUserId) {
    await recordFraudEvent({
      userId: voterUserId,
      eventType: 'CHALLENGE_SELF_VOTE_ATTEMPT',
      riskLevel: 'LOW',
      details: { challengeId, videoId, creatorUserId: entry.creatorId },
      sourceId: null,
    });
    return { ok: false, code: 'SELF_VOTE' };
  }

  const existing = await prisma.challengeVote.findUnique({
    where: {
      challengeId_videoId_voterUserId: { challengeId, videoId, voterUserId },
    },
  });

  await prisma.challengeVote.upsert({
    where: {
      challengeId_videoId_voterUserId: { challengeId, videoId, voterUserId },
    },
    create: {
      challengeId,
      videoId,
      voterUserId,
      creatorUserId: entry.creatorId,
      stars,
    },
    update: { stars },
  });

  return { ok: true, updated: !!existing };
}

/**
 * Compute Bayesian-weighted vote score for small-sample protection.
 * Formula: (priorMean * priorWeight + sum(stars)) / (priorWeight + votesCount)
 * Ensures 2 votes at 5.0 do not beat 100 votes at 4.8.
 */
export function computeWeightedVoteScore(votesCount: number, averageStars: number): number {
  if (votesCount <= 0) return CHALLENGE_VOTE_PRIOR_MEAN;
  const sum = averageStars * votesCount;
  return (CHALLENGE_VOTE_PRIOR_MEAN * CHALLENGE_VOTE_PRIOR_WEIGHT + sum) / (CHALLENGE_VOTE_PRIOR_WEIGHT + votesCount);
}

export interface ChallengeVoteSummaryEntry {
  videoId: string;
  votesCount: number;
  averageStars: number;
  weightedVoteScore: number;
  /** 0–1 normalized for display/ranking. (weightedVoteScore - 1) / 4. */
  normalizedVoteScore?: number;
}

/**
 * Get vote summary for multiple videos (across all challenges).
 * Used by For You feed to include challenge star ratings.
 */
export async function getChallengeVoteSummaryByVideoIds(
  videoIds: string[]
): Promise<Map<string, { averageStars: number; votesCount: number; weightedVoteScore: number }>> {
  if (videoIds.length === 0) return new Map();
  const agg = await prisma.challengeVote.groupBy({
    by: ['videoId'],
    where: { videoId: { in: videoIds } },
    _count: { id: true },
    _avg: { stars: true },
  });
  const map = new Map<string, { averageStars: number; votesCount: number; weightedVoteScore: number }>();
  for (const a of agg) {
    const votesCount = a._count.id;
    const averageStars = a._avg.stars ?? 0;
    const weightedVoteScore = computeWeightedVoteScore(votesCount, averageStars);
    map.set(a.videoId, {
      averageStars: Math.round(averageStars * 100) / 100,
      votesCount,
      weightedVoteScore: Math.round(weightedVoteScore * 1000) / 1000,
    });
  }
  return map;
}

const CHALLENGE_VOTE_SUMMARY_CACHE_PREFIX = 'challenge-vote-summary:';

/** Invalidate vote summary cache after a vote. Call from vote API. */
export function invalidateChallengeVoteSummaryCache(challengeId: string): void {
  cacheSet(`${CHALLENGE_VOTE_SUMMARY_CACHE_PREFIX}${challengeId}`, null, 0);
}

/**
 * Get vote summary for all entries in a challenge.
 * Cached 30s per challenge for leaderboard/summary page performance.
 * Pass skipCache=true when returning fresh data after a vote.
 */
export async function getChallengeVoteSummary(
  challengeId: string,
  options?: { skipCache?: boolean }
): Promise<ChallengeVoteSummaryEntry[]> {
  const cacheKey = `${CHALLENGE_VOTE_SUMMARY_CACHE_PREFIX}${challengeId}`;
  if (!options?.skipCache) {
    const cached = cacheGet<ChallengeVoteSummaryEntry[]>(cacheKey);
    if (cached) return cached;
  }

  const agg = await prisma.challengeVote.groupBy({
    by: ['videoId'],
    where: { challengeId },
    _count: { id: true },
    _avg: { stars: true },
  });

  const summary = agg.map((a) => {
    const votesCount = a._count.id;
    const averageStars = a._avg.stars ?? 0;
    const weightedVoteScore = computeWeightedVoteScore(votesCount, averageStars);
    /** 0–1 scale: (1–5) → (0–1) for display/ranking. */
    const normalizedVoteScore = Math.max(0, Math.min(1, (weightedVoteScore - 1) / 4));
    return {
      videoId: a.videoId,
      votesCount,
      averageStars: Math.round(averageStars * 100) / 100,
      weightedVoteScore: Math.round(weightedVoteScore * 1000) / 1000,
      normalizedVoteScore: Math.round(normalizedVoteScore * 1000) / 1000,
    };
  });

  cacheSet(cacheKey, summary, CACHE_TTL.CHALLENGE_VOTE_SUMMARY);
  return summary;
}

/**
 * Get vote count in last N hours per video (for momentum signal).
 */
export async function getChallengeVotesLast24hPerVideo(
  challengeId: string,
  videoIds: string[],
  hoursWindow = 24
): Promise<Map<string, number>> {
  if (videoIds.length === 0) return new Map();
  const since = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
  const agg = await prisma.challengeVote.groupBy({
    by: ['videoId'],
    where: { challengeId, videoId: { in: videoIds }, createdAt: { gte: since } },
    _count: { id: true },
  });
  const map = new Map<string, number>();
  for (const a of agg) {
    map.set(a.videoId, a._count.id);
  }
  return map;
}

