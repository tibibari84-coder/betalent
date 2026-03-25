import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { credit, debitInTransaction } from '@/services/wallet.service';
import {
  COIN_VIDEO_UPLOAD_REWARD,
  COIN_CHALLENGE_REWARDS,
  SUPER_VOTE_PACKAGES,
  type SuperVotePackageKey,
} from '@/constants/coins';

/**
 * Coin service: upload reward, super votes, challenge rewards.
 *
 * Support economy (do not mix):
 * - Likes: free (POST/DELETE /api/like); no coins, no support stats.
 * - Super votes: competitive support; cost coins, wallet tx, VideoSupportStats, Video.score (challenge ranking).
 * - Gifts: premium fan support; cost coins, wallet tx, creator/video gift stats (gift.service); no Video.score.
 */

/**
 * Reward creator when a performance is successfully published.
 */
export async function rewardUpload(userId: string, videoId: string): Promise<
  | { success: true; newBalance: number }
  | { success: false; reason: string }
> {
  const result = await credit(userId, COIN_VIDEO_UPLOAD_REWARD, {
    type: 'VIDEO_UPLOAD_REWARD',
    referenceId: videoId,
    description: 'Video upload reward',
  });
  return result.success ? { success: true, newBalance: result.newBalance } : { success: false, reason: result.reason };
}

/**
 * Spend coins for super vote on a video.
 * - Wallet: debit sender, credit creator (both create CoinTransaction).
 * - Video: VideoSupportStats (totalSuperVotes, totalCoinsEarned); Video.score (for challenge ranking).
 * Super votes are competitive support; they do not touch gift/creator-earnings ledgers.
 */
export async function spendCoinsForSuperVote(
  userId: string,
  videoId: string,
  packageKey: SuperVotePackageKey
): Promise<
  | { success: true; newBalance: number; superVotes: number }
  | { success: false; reason: string }
> {
  const coinCost = SUPER_VOTE_PACKAGES[packageKey];
  if (coinCost == null) return { success: false, reason: 'Invalid package' };

  const video = await prisma.video.findFirst({
    where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
    select: { id: true, creatorId: true },
  });
  if (!video) return { success: false, reason: 'Video not found' };
  if (video.creatorId === userId) return { success: false, reason: 'Cannot super vote your own video' };

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const debitResult = await debitInTransaction(tx, userId, coinCost, {
      type: 'SUPER_VOTE_SPENT',
      toUserId: video.creatorId,
      videoId,
      description: `Super vote x${packageKey}`,
    });
    if (!debitResult.ok) return { ok: false as const, reason: debitResult.reason };

    await creditInTransaction(tx, video.creatorId, coinCost, {
      type: 'RECEIVED_VOTES',
      videoId,
      description: 'Super vote support',
    });

    await tx.videoSupportStats.upsert({
      where: { videoId },
      create: {
        videoId,
        totalSuperVotes: packageKey,
        totalCoinsEarned: coinCost,
        updatedAt: new Date(),
      },
      update: {
        totalSuperVotes: { increment: packageKey },
        totalCoinsEarned: { increment: coinCost },
        updatedAt: new Date(),
      },
    });

    // Challenge ranking: Video.score is the "votes" signal; super votes add to it (competitive support only).
    await tx.video.update({
      where: { id: videoId },
      data: { score: { increment: packageKey } },
    });

    const wallet = await tx.userWallet.findUniqueOrThrow({ where: { userId } });
    return { ok: true as const, newBalance: wallet.coinBalance, superVotes: packageKey };
  });

  if (!result.ok) return { success: false, reason: result.reason };
  return { success: true, newBalance: result.newBalance, superVotes: result.superVotes };
}

/** Credit wallet inside an existing Prisma transaction (for super-vote flow). */
async function creditInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  options: { type: 'RECEIVED_VOTES'; videoId?: string | null; description?: string | null }
): Promise<void> {
  await tx.userWallet.upsert({
    where: { userId },
    create: {
      userId,
      coinBalance: amount,
      totalCoinsPurchased: 0,
      totalCoinsSpent: 0,
      lifetimeEarned: amount,
    },
    update: {
      coinBalance: { increment: amount },
      lifetimeEarned: { increment: amount },
    },
  });
  await tx.coinTransaction.create({
    data: {
      fromUserId: null,
      toUserId: userId,
      videoId: options.videoId ?? null,
      type: options.type,
      amount,
      description: options.description ?? null,
    },
  });
}

/**
 * Award challenge reward coins to a creator. Idempotent per (userId, challengeId) using ChallengeWinner.
 */
export async function awardChallengeReward(
  userId: string,
  challengeId: string,
  placement: number,
  rewardCoins: number
): Promise<{ success: true } | { success: false; reason: string }> {
  if (rewardCoins <= 0) return { success: false, reason: 'Invalid reward amount' };

  const existing = await prisma.challengeWinner.findUnique({
    where: { challengeId_creatorId: { challengeId, creatorId: userId } },
  });
  if (existing) return { success: true }; // already awarded

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.challengeWinner.create({
      data: { challengeId, creatorId: userId, rank: placement, coinsAwarded: rewardCoins },
    });
    await tx.userWallet.upsert({
      where: { userId },
      create: {
        userId,
        coinBalance: rewardCoins,
        totalCoinsPurchased: 0,
        totalCoinsSpent: 0,
        lifetimeEarned: rewardCoins,
      },
      update: {
        coinBalance: { increment: rewardCoins },
        lifetimeEarned: { increment: rewardCoins },
      },
    });
    await tx.coinTransaction.create({
      data: {
        fromUserId: null,
        toUserId: userId,
        type: 'CHALLENGE_REWARD',
        amount: rewardCoins,
        description: `Challenge reward #${placement}`,
      },
    });
    return { ok: true as const };
  });

  return { success: true };
}

export function getChallengeRewardForPlacement(placement: number): number {
  return COIN_CHALLENGE_REWARDS[placement] ?? 0;
}
