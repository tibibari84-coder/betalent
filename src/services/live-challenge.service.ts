/**
 * Live Challenge service: sessions, voting, gifts, scoring.
 * Synchronized show / arena slots (not traditional RTMP live streaming).
 */

import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordFraudEvent } from '@/services/fraud-risk.service';
import { emitLiveSessionEvent } from '@/lib/live-session-events';
import { sendGift } from '@/services/gift.service';
import { upsertVideoRankingStats } from '@/services/ranking.service';
import { LIVE_QUICK_GIFT_SLUG_BY_COINS } from '@/constants/live-gift-catalog';
import {
  LIVE_VOTE_STARS_MIN,
  LIVE_VOTE_STARS_MAX,
  LIVE_VOTE_RATE_LIMIT_PER_MIN,
  LIVE_VOTE_PRIOR_MEAN,
  LIVE_VOTE_PRIOR_WEIGHT,
  LIVE_SCORE_W_VOTE,
  LIVE_SCORE_W_GIFT,
  LIVE_SCORE_W_ENGAGEMENT,
  LIVE_GIFT_MAX_COINS,
} from '@/constants/live-challenge';
import type { LiveSessionStatus, LiveSlotStatus } from '@prisma/client';

export type SubmitLiveVoteResult =
  | { ok: true; updated: boolean }
  | { ok: false; code: 'SESSION_NOT_FOUND' | 'NOT_LIVE' | 'SELF_VOTE' | 'INVALID_STARS' | 'RATE_LIMIT' | 'SLOT_CLOSED' | 'UNAUTHORIZED' };

export type SendLiveGiftResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'SESSION_NOT_FOUND'
        | 'NOT_LIVE'
        | 'SELF_GIFT'
        | 'INSUFFICIENT_BALANCE'
        | 'INVALID_COINS'
        | 'SLOT_CLOSED'
        | 'UNAUTHORIZED'
        | 'WALLET_NOT_FOUND'
        | 'RATE_LIMIT';
    };

/** Weighted vote score (Bayesian) */
export function computeLiveWeightedVoteScore(votesCount: number, averageStars: number): number {
  if (votesCount <= 0) return LIVE_VOTE_PRIOR_MEAN;
  const sum = averageStars * votesCount;
  return (LIVE_VOTE_PRIOR_MEAN * LIVE_VOTE_PRIOR_WEIGHT + sum) / (LIVE_VOTE_PRIOR_WEIGHT + votesCount);
}

/** Live score formula */
export function computeLiveScore(params: {
  votesCount: number;
  averageStars: number;
  giftCoins: number;
}): number {
  const { votesCount, averageStars, giftCoins } = params;
  const weightedVote = computeLiveWeightedVoteScore(votesCount, averageStars);
  const voteScore = ((weightedVote - 1) / 4) * 100; // 0–100
  const giftScore = Math.min(giftCoins, 10000) / 100; // cap 10k coins = 100
  const engagementBoost = Math.min(votesCount * 2, 20); // votes as engagement
  return (
    voteScore * LIVE_SCORE_W_VOTE +
    giftScore * LIVE_SCORE_W_GIFT +
    engagementBoost * LIVE_SCORE_W_ENGAGEMENT
  );
}

/** Get live leaderboard for session */
export async function getLiveLeaderboard(sessionId: string) {
  const session = await prisma.liveChallengeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });
  if (!session) return null;

  const slots = await prisma.livePerformanceSlot.findMany({
    where: { sessionId },
    include: {
      performer: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
        },
      },
      video: {
        select: { id: true, title: true, thumbnailUrl: true },
      },
    },
    orderBy: { slotOrder: 'asc' },
  });

  const performerIds = slots.map((s) => s.performerUserId);

  /**
   * Gift coins for leaderboard: dual-read (no backfill required).
   * - GiftTransaction (context LIVE): current source of truth for new sends (sendLiveGift → sendGift).
   * - LiveGift: legacy rows only; new code never writes here. Summed together per performer — no overlap in normal operation.
   */
  const [voteAgg, giftAgg, legacyLiveGiftAgg] = await Promise.all([
    prisma.liveVote.groupBy({
      by: ['performerUserId'],
      where: { sessionId },
      _count: { id: true },
      _avg: { stars: true },
    }),
    prisma.giftTransaction.groupBy({
      by: ['receiverId'],
      where: { liveSessionId: sessionId, context: 'LIVE', status: 'COMPLETED' },
      _sum: { coinAmount: true },
    }),
    prisma.liveGift.groupBy({
      by: ['performerUserId'],
      where: { sessionId },
      _sum: { coins: true },
    }),
  ]);

  const voteMap = new Map(voteAgg.map((v) => [v.performerUserId, { count: v._count.id, avg: v._avg.stars ?? 0 }]));
  const giftMap = new Map(giftAgg.map((g) => [g.receiverId, g._sum.coinAmount ?? 0]));
  const legacyGiftMap = new Map(
    legacyLiveGiftAgg.map((g) => [g.performerUserId, g._sum.coins ?? 0])
  );

  const entries = performerIds.map((performerUserId) => {
    const v = voteMap.get(performerUserId) ?? { count: 0, avg: 0 };
    const giftCoins = (giftMap.get(performerUserId) ?? 0) + (legacyGiftMap.get(performerUserId) ?? 0);
    const liveScore = computeLiveScore({
      votesCount: v.count,
      averageStars: v.avg,
      giftCoins,
    });
    return { performerUserId, votesCount: v.count, averageStars: v.avg, giftCoins, liveScore };
  });

  entries.sort((a, b) => b.liveScore - a.liveScore);

  return entries.map((e, i) => {
    const slot = slots.find((s) => s.performerUserId === e.performerUserId)!;
    return {
      rank: i + 1,
      performerUserId: e.performerUserId,
      performer: slot.performer,
      video: slot.video,
      votesCount: e.votesCount,
      averageStars: e.averageStars,
      giftCoins: e.giftCoins,
      liveScore: Math.round(e.liveScore * 10) / 10,
      slotStatus: slot.status,
    };
  });
}

/** Submit live vote */
export async function submitLiveVote(params: {
  sessionId: string;
  performerUserId: string;
  voterUserId: string;
  stars: number;
}): Promise<SubmitLiveVoteResult> {
  const { sessionId, performerUserId, voterUserId, stars } = params;

  if (stars < LIVE_VOTE_STARS_MIN || stars > LIVE_VOTE_STARS_MAX) {
    return { ok: false, code: 'INVALID_STARS' };
  }

  if (performerUserId === voterUserId) {
    await recordFraudEvent({
      userId: voterUserId,
      eventType: 'LIVE_SELF_VOTE_ATTEMPT',
      riskLevel: 'LOW',
      details: { sessionId, performerUserId },
      sourceId: null,
    });
    return { ok: false, code: 'SELF_VOTE' };
  }

  if (!(await checkRateLimit('live-vote', voterUserId, LIVE_VOTE_RATE_LIMIT_PER_MIN, 60 * 1000))) {
    return { ok: false, code: 'RATE_LIMIT' };
  }

  const session = await prisma.liveChallengeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, currentPerformerId: true },
  });

  if (!session) return { ok: false, code: 'SESSION_NOT_FOUND' };
  if (session.status !== 'LIVE') return { ok: false, code: 'NOT_LIVE' };
  if (!session.currentPerformerId || session.currentPerformerId !== performerUserId) {
    return { ok: false, code: 'SLOT_CLOSED' };
  }

  const slot = await prisma.livePerformanceSlot.findFirst({
    where: { sessionId, performerUserId, status: 'LIVE' },
    select: { status: true },
  });
  if (!slot) {
    return { ok: false, code: 'SLOT_CLOSED' };
  }

  const existing = await prisma.liveVote.findUnique({
    where: {
      sessionId_performerUserId_voterUserId: { sessionId, performerUserId, voterUserId },
    },
  });

  await prisma.liveVote.upsert({
    where: {
      sessionId_performerUserId_voterUserId: { sessionId, performerUserId, voterUserId },
    },
    create: { sessionId, performerUserId, voterUserId, stars },
    update: { stars },
  });

  const leaderboard = await getLiveLeaderboard(sessionId);
  emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
  emitLiveSessionEvent(sessionId, { type: 'vote', performerUserId });

  return { ok: true, updated: !!existing };
}

/** Send live gift (coins) — unified with GiftTransaction (context LIVE, liveSessionId). */
export async function sendLiveGift(params: {
  sessionId: string;
  performerUserId: string;
  senderUserId: string;
  coins: number;
}): Promise<SendLiveGiftResult> {
  const { sessionId, performerUserId, senderUserId, coins } = params;

  if (coins <= 0 || coins > LIVE_GIFT_MAX_COINS) {
    return { ok: false, code: 'INVALID_COINS' };
  }

  if (performerUserId === senderUserId) {
    await recordFraudEvent({
      userId: senderUserId,
      eventType: 'LIVE_SELF_GIFT_ATTEMPT',
      riskLevel: 'LOW',
      details: { sessionId, performerUserId },
      sourceId: null,
    });
    return { ok: false, code: 'SELF_GIFT' };
  }

  const session = await prisma.liveChallengeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, currentPerformerId: true },
  });

  if (!session) return { ok: false, code: 'SESSION_NOT_FOUND' };
  if (session.status !== 'LIVE') return { ok: false, code: 'NOT_LIVE' };
  if (!session.currentPerformerId || session.currentPerformerId !== performerUserId) {
    return { ok: false, code: 'SLOT_CLOSED' };
  }

  const slot = await prisma.livePerformanceSlot.findFirst({
    where: { sessionId, performerUserId, status: 'LIVE' },
    select: { status: true, videoId: true },
  });
  if (!slot?.videoId) {
    return { ok: false, code: 'SLOT_CLOSED' };
  }

  const slug = LIVE_QUICK_GIFT_SLUG_BY_COINS[coins];
  if (!slug) {
    return { ok: false, code: 'INVALID_COINS' };
  }

  const catalogGift = await prisma.gift.findFirst({
    where: { slug, isActive: true },
    select: { id: true, coinCost: true },
  });
  if (!catalogGift || catalogGift.coinCost !== coins) {
    return { ok: false, code: 'INVALID_COINS' };
  }

  const result = await sendGift(senderUserId, {
    videoId: slot.videoId,
    giftId: catalogGift.id,
    context: 'live',
    liveSessionId: sessionId,
  });

  if (!result.success) {
    if (result.code === 'INSUFFICIENT_BALANCE') return { ok: false, code: 'INSUFFICIENT_BALANCE' };
    if (result.code === 'RATE_LIMIT_EXCEEDED' || result.code === 'HIGH_FREQUENCY_PAIR' || result.code === 'DUPLICATE_ATTEMPT') {
      return { ok: false, code: 'RATE_LIMIT' };
    }
    if (result.code === 'LIVE_CONTEXT_INVALID' || result.code === 'LIVE_SESSION_REQUIRED') {
      return { ok: false, code: 'SLOT_CLOSED' };
    }
    return { ok: false, code: 'INSUFFICIENT_BALANCE' };
  }
  if ('idempotencyReplay' in result && result.idempotencyReplay) {
    return { ok: true };
  }

  upsertVideoRankingStats(slot.videoId).catch(() => {});

  const leaderboard = await getLiveLeaderboard(sessionId);
  emitLiveSessionEvent(sessionId, { type: 'leaderboard', payload: { leaderboard } });
  emitLiveSessionEvent(sessionId, { type: 'gift', performerUserId });

  return { ok: true };
}
