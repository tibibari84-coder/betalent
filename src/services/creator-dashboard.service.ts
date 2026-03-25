/**
 * Creator earnings dashboard: aggregates support and earnings for the dashboard UI.
 * Does not mix with likes; uses gift, super vote, and challenge reward data only.
 *
 * Pending vs withdrawable: backend-safe, single source of truth. Do not present all support as instantly withdrawable.
 */

import { prisma } from '@/lib/prisma';
import { PAYOUT_HOLD_DAYS, CHALLENGE_REWARDS_SUBJECT_TO_HOLD } from '@/constants/payout';

/**
 * Computes pending vs estimated withdrawable from raw support totals.
 * Rules:
 * - Recent support (within hold window) remains pending.
 * - Eligible support (outside hold window) becomes estimated withdrawable.
 * - Challenge rewards follow CHALLENGE_REWARDS_SUBJECT_TO_HOLD for pending.
 * - Estimated withdrawable = lifetime - pending; never expose full lifetime as withdrawable.
 */
export function computePendingAndWithdrawable(
  lifetimeCoins: number,
  pendingFromGifts: number,
  pendingFromSuperVotes: number,
  pendingFromChallenges: number
): { pendingCoins: number; estimatedWithdrawableCoins: number } {
  const pendingCoins = Math.min(
    pendingFromGifts +
      pendingFromSuperVotes +
      (CHALLENGE_REWARDS_SUBJECT_TO_HOLD ? pendingFromChallenges : 0),
    lifetimeCoins
  );
  const estimatedWithdrawableCoins = Math.max(0, lifetimeCoins - pendingCoins);
  return { pendingCoins, estimatedWithdrawableCoins };
}

export type CreatorEarningsDashboardSummary = {
  totalGiftCoins: number;
  totalSuperVoteCoins: number;
  totalChallengeRewardCoins: number;
  totalSupportCoins: number;
  /** Eligible for future payout: lifetime minus pending (support outside hold window). Never all support. */
  estimatedWithdrawableCoins: number;
  /** Support in hold window; remains pending until the hold period passes. */
  pendingCoins: number;
  /** All-time support total (gifts + super votes + challenge rewards). */
  lifetimeCoins: number;
  updatedAt: string;
};

export type DashboardActivityItem = {
  id: string;
  type: 'gift' | 'super_vote' | 'challenge_reward';
  amount: number;
  sourceLabel: string;
  date: string;
};

export type TopPerformanceRow = {
  videoId: string;
  title: string;
  styleOrCategory?: string;
  totalGiftCoins: number;
  totalSuperVoteCoins: number;
  totalSupportCoins: number;
};

export type CreatorEarningsDashboard = {
  summary: CreatorEarningsDashboardSummary;
  recentActivity: DashboardActivityItem[];
  topPerformances: TopPerformanceRow[];
};

/**
 * Aggregates creator earnings and support into a dashboard summary.
 * Uses User.totalCoinsReceived (gifts), VideoSupportStats (super votes), ChallengeWinner (rewards).
 */
export async function getCreatorEarningsDashboard(
  creatorId: string,
  options: { activityLimit?: number; topPerformancesLimit?: number } = {}
): Promise<CreatorEarningsDashboard> {
  const { activityLimit = 30, topPerformancesLimit = 10 } = options;

  const pendingThreshold = new Date();
  pendingThreshold.setDate(pendingThreshold.getDate() - PAYOUT_HOLD_DAYS);

  const [
    user,
    earningsSummary,
    superVoteAgg,
    challengeRewardAgg,
    recentCoinTx,
    recentGiftTx,
    videosWithSupport,
    pendingGiftAgg,
    pendingReceivedVotesAgg,
    pendingChallengeAgg,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: creatorId },
      select: { totalCoinsReceived: true },
    }),
    prisma.creatorEarningsSummary.findUnique({
      where: { creatorId },
      select: { totalEarningsCoins: true, availableEarningsCoins: true, updatedAt: true },
    }),
    prisma.videoSupportStats.aggregate({
      where: { video: { creatorId } },
      _sum: { totalCoinsEarned: true },
    }),
    prisma.challengeWinner.aggregate({
      where: { creatorId },
      _sum: { coinsAwarded: true },
    }),
    prisma.coinTransaction.findMany({
      where: {
        toUserId: creatorId,
        type: { in: ['RECEIVED_VOTES', 'CHALLENGE_REWARD'] },
      },
      orderBy: { createdAt: 'desc' },
      take: activityLimit,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    }),
    prisma.giftTransaction.findMany({
      where: { receiverId: creatorId },
      orderBy: { createdAt: 'desc' },
      take: activityLimit,
      select: {
        id: true,
        coinAmount: true,
        creatorShareCoins: true,
        createdAt: true,
        gift: { select: { name: true } },
      },
    }),
    prisma.video.findMany({
      where: { creatorId },
      select: {
        id: true,
        title: true,
        coinsCount: true,
        categoryId: true,
        category: { select: { name: true } },
        supportStats: { select: { totalCoinsEarned: true } },
      },
    }),
    prisma.giftTransaction.aggregate({
      where: {
        receiverId: creatorId,
        createdAt: { gte: pendingThreshold },
      },
      _sum: { creatorShareCoins: true },
    }),
    prisma.coinTransaction.aggregate({
      where: {
        toUserId: creatorId,
        type: 'RECEIVED_VOTES',
        createdAt: { gte: pendingThreshold },
      },
      _sum: { amount: true },
    }),
    prisma.coinTransaction.aggregate({
      where: {
        toUserId: creatorId,
        type: 'CHALLENGE_REWARD',
        createdAt: { gte: pendingThreshold },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalGiftCoins = user?.totalCoinsReceived ?? 0;
  const totalSuperVoteCoins = superVoteAgg._sum.totalCoinsEarned ?? 0;
  const totalChallengeRewardCoins = challengeRewardAgg._sum.coinsAwarded ?? 0;
  const totalSupportCoins = totalGiftCoins + totalSuperVoteCoins;
  const lifetimeCoins = totalSupportCoins + totalChallengeRewardCoins;

  const updatedAt = earningsSummary?.updatedAt ?? new Date();

  const pendingFromGifts = pendingGiftAgg._sum.creatorShareCoins ?? 0;
  const pendingFromSuperVotes = pendingReceivedVotesAgg._sum.amount ?? 0;
  const pendingFromChallenges = pendingChallengeAgg._sum.amount ?? 0;
  const { pendingCoins, estimatedWithdrawableCoins } = computePendingAndWithdrawable(
    lifetimeCoins,
    pendingFromGifts,
    pendingFromSuperVotes,
    pendingFromChallenges
  );

  const summary: CreatorEarningsDashboardSummary = {
    totalGiftCoins,
    totalSuperVoteCoins,
    totalChallengeRewardCoins,
    totalSupportCoins,
    estimatedWithdrawableCoins,
    pendingCoins,
    lifetimeCoins,
    updatedAt: updatedAt.toISOString(),
  };

  const activityMap = new Map<string, DashboardActivityItem>();
  recentCoinTx.forEach((t) => {
    activityMap.set(`ct-${t.id}`, {
      id: t.id,
      type: t.type === 'CHALLENGE_REWARD' ? 'challenge_reward' : 'super_vote',
      amount: t.amount,
      sourceLabel: t.type === 'CHALLENGE_REWARD' ? 'Challenge reward' : 'Super votes received',
      date: t.createdAt.toISOString(),
    });
  });
  recentGiftTx.forEach((g) => {
    activityMap.set(`gt-${g.id}`, {
      id: g.id,
      type: 'gift',
      amount: g.creatorShareCoins,
      sourceLabel: `Gift: ${g.gift.name}`,
      date: g.createdAt.toISOString(),
    });
  });
  const recentActivity = Array.from(activityMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, activityLimit);

  const topPerformances: TopPerformanceRow[] = videosWithSupport
    .map((v) => ({
      videoId: v.id,
      title: v.title,
      styleOrCategory: v.category?.name ?? undefined,
      totalGiftCoins: v.coinsCount,
      totalSuperVoteCoins: v.supportStats?.totalCoinsEarned ?? 0,
      totalSupportCoins: v.coinsCount + (v.supportStats?.totalCoinsEarned ?? 0),
    }))
    .filter((r) => r.totalSupportCoins > 0)
    .sort((a, b) => b.totalSupportCoins - a.totalSupportCoins)
    .slice(0, topPerformancesLimit);

  return { summary, recentActivity, topPerformances };
}
