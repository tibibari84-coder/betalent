import type { GiftContext, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { debitInTransaction } from '@/services/wallet.service';
import { computeGiftSplit } from '@/services/revenue-split.service';
import { getISOWeek } from '@/lib/date-utils';
import { FOR_YOU_GIFT_VELOCITY_HALF_LIFE_HOURS } from '@/constants/ranking';
import { resolveGiftContext } from '@/services/gift-context-resolver.service';
import { assertLiveGiftEligible } from '@/services/live-gift-validation.service';
import {
  checkIdempotency,
  saveIdempotency,
  checkRateLimit,
  isNewAccount,
  isLikelyDuplicate,
  recordAbuseFlag,
} from '@/services/gift-anti-abuse.service';

/** Streak: consecutive gifts same user/video within this window (session). */
const GIFT_STREAK_WINDOW_MS = 15 * 60 * 1000;

/**
 * Gift sending service: premium fan support. The only place that creates GiftTransaction
 * and updates gift-related economy state.
 *
 * Support economy separation (do not mix):
 * - Likes: free engagement only (POST/DELETE /api/like); no wallet, no support stats.
 * - Super votes: competitive support; cost coins, update Video.score + VideoSupportStats (coin.service).
 * - Gifts: premium fan support; cost coins, update creator earnings + video/creator support stats (here).
 *
 * Economy layer (all in one transaction):
 * 1. Wallet – debit via wallet.service (CoinTransaction GIFT_SENT).
 * 2. GiftTransaction – one per send (audit).
 * 3. Creator earnings – CreatorEarningsLedger + CreatorEarningsSummary (gift-only).
 * 4. Platform revenue – PlatformRevenueLedger (gift-only).
 * 5. Video stats – coinsCount, giftsCount; VideoGiftTypeSummary, VideoSupporterSummary.
 * 6. Creator stats – User.totalCoinsReceived, CreatorSupporterSummary, CreatorSupportWeekly.
 * 7. For You ranking: VideoSupportStats.forYouGiftCoinsTotal + time-decayed recentGiftVelocity (FORYOU + LIVE, not CHALLENGE).
 * 8. Challenge ranking: VideoSupportStats.totalCoinsEarned (CHALLENGE context only).
 */

export type GiftContextType = 'foryou' | 'challenge' | 'live';

export type SendGiftInput = {
  videoId: string;
  giftId: string;
  /** Client hint; server resolves authoritative context (see gift-context-resolver). */
  context?: GiftContextType | null;
  /** Required when context resolves to LIVE. */
  liveSessionId?: string | null;
  /** Optional idempotency key: same key + user returns same response (replay protection). */
  idempotencyKey?: string | null;
};

export type SendGiftErrorCode =
  | 'UNAUTHORIZED'
  | 'VIDEO_NOT_FOUND'
  | 'CANNOT_GIFT_OWN_VIDEO'
  | 'GIFT_NOT_FOUND'
  | 'GIFT_INACTIVE'
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'HIGH_FREQUENCY_PAIR'
  | 'DUPLICATE_ATTEMPT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'LIVE_SESSION_REQUIRED'
  | 'LIVE_CONTEXT_INVALID';

export type SendGiftResult =
  | {
      success: true;
      giftTransactionId: string;
      coinAmount: number;
      creatorShareCoins: number;
      platformShareCoins: number;
      senderNewBalance: number;
      videoCoinsCount: number;
      videoGiftsCount: number;
      sessionStreak: number;
      resolvedContext: GiftContext;
      topSupporter: { userId: string; displayName: string; totalCoinsSent: number } | null;
    }
  | { success: true; idempotencyReplay: true; responseBody: string }
  | { success: false; code: SendGiftErrorCode; message: string };

function decayVelocity(prevVelocity: number, lastAt: Date, now: Date): number {
  const hours = (now.getTime() - lastAt.getTime()) / (3600 * 1000);
  return prevVelocity * Math.exp(-hours / FOR_YOU_GIFT_VELOCITY_HALF_LIFE_HOURS);
}

/**
 * Sends a gift from the authenticated sender to the video's creator.
 * All steps run in a single DB transaction: no partial failures, no double-spend.
 */
export async function sendGift(senderId: string, input: SendGiftInput): Promise<SendGiftResult> {
  const { videoId, giftId, context: contextParam, idempotencyKey, liveSessionId: liveSessionIdParam } = input;
  if (!videoId || !giftId) {
    return {
      success: false,
      code: 'VIDEO_NOT_FOUND',
      message: 'videoId and giftId are required',
    };
  }

  const clientContext = contextParam ?? 'foryou';
  const resolvedContext = await resolveGiftContext({
    videoId,
    clientContext,
  });

  if (resolvedContext === 'LIVE') {
    const sid = typeof liveSessionIdParam === 'string' ? liveSessionIdParam.trim() : '';
    if (!sid) {
      return { success: false, code: 'LIVE_SESSION_REQUIRED', message: 'Live session is required for this gift' };
    }
    const v = await prisma.video.findFirst({
      where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
      select: { creatorId: true },
    });
    if (!v) {
      return { success: false, code: 'VIDEO_NOT_FOUND', message: 'Video not found' };
    }
    const liveOk = await assertLiveGiftEligible({
      sessionId: sid,
      videoId,
      receiverId: v.creatorId,
    });
    if (!liveOk.ok) {
      return { success: false, code: 'LIVE_CONTEXT_INVALID', message: liveOk.message };
    }
  }

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient): Promise<SendGiftResult> => {
      if (idempotencyKey?.trim()) {
        const idem = await checkIdempotency(tx, idempotencyKey.trim(), senderId);
        if ('conflict' in idem && idem.conflict) {
          return {
            success: false,
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency key already used by another request',
          };
        }
        if ('hit' in idem && idem.hit) {
          return { success: true, idempotencyReplay: true, responseBody: idem.responseBody };
        }
      }

      const [video, gift] = await Promise.all([
        tx.video.findFirst({
          where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
          select: { id: true, creatorId: true, coinsCount: true, giftsCount: true },
        }),
        tx.gift.findUnique({
          where: { id: giftId },
          select: { id: true, coinCost: true, isActive: true },
        }),
      ]);

      if (!video) {
        return { success: false, code: 'VIDEO_NOT_FOUND', message: 'Video not found' };
      }
      if (!gift) {
        return { success: false, code: 'GIFT_NOT_FOUND', message: 'Gift not found' };
      }
      if (!gift.isActive) {
        return { success: false, code: 'GIFT_INACTIVE', message: 'Gift is not available' };
      }
      const receiverId = video.creatorId;
      if (receiverId === senderId) {
        await recordAbuseFlag(tx, {
          senderId,
          receiverId,
          videoId,
          kind: 'SELF_GIFT_ATTEMPT',
          details: 'senderId === receiverId',
        });
        return {
          success: false,
          code: 'CANNOT_GIFT_OWN_VIDEO',
          message: 'You cannot send a gift on your own video',
        };
      }

      if (resolvedContext === 'LIVE') {
        const sid = typeof liveSessionIdParam === 'string' ? liveSessionIdParam.trim() : '';
        const liveOk2 = await assertLiveGiftEligible({
          sessionId: sid,
          videoId,
          receiverId,
        });
        if (!liveOk2.ok) {
          return { success: false, code: 'LIVE_CONTEXT_INVALID', message: liveOk2.message };
        }
      }

      const rate = await checkRateLimit(tx, senderId, receiverId);
      if (!rate.allowed) {
        await recordAbuseFlag(tx, {
          senderId,
          receiverId,
          videoId,
          kind: rate.kind,
          details: rate.reason,
        });
        return {
          success: false,
          code: rate.kind,
          message: rate.reason,
        };
      }

      const duplicate = await isLikelyDuplicate(tx, senderId, videoId, gift.id);
      if (duplicate) {
        await recordAbuseFlag(tx, {
          senderId,
          receiverId,
          videoId,
          kind: 'DUPLICATE_ATTEMPT',
          details: 'Same sender/video/gift within 30s',
        });
        return {
          success: false,
          code: 'DUPLICATE_ATTEMPT',
          message: 'Duplicate gift attempt. Please wait before sending again.',
        };
      }

      const coinAmount = gift.coinCost;
      const split = computeGiftSplit(coinAmount, { giftId: gift.id });
      const { creatorShareCoins, platformShareCoins } = split;

      const debitResult = await debitInTransaction(
        tx,
        senderId,
        coinAmount,
        {
          type: 'GIFT_SENT',
          toUserId: video.creatorId,
          videoId,
          description: null,
        }
      );

      if (!debitResult.ok) {
        if (debitResult.reason === 'Insufficient balance') {
          return {
            success: false,
            code: 'INSUFFICIENT_BALANCE',
            message: 'Not enough coins to send this gift',
          };
        }
        return {
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: debitResult.reason,
        };
      }

      const giftContext: GiftContext = resolvedContext;
      const liveSid =
        giftContext === 'LIVE' && typeof liveSessionIdParam === 'string' ? liveSessionIdParam.trim() : null;

      const giftTransaction = await tx.giftTransaction.create({
        data: {
          senderId,
          receiverId: video.creatorId,
          videoId,
          giftId: gift.id,
          coinAmount,
          creatorShareCoins,
          platformShareCoins,
          status: 'COMPLETED',
          context: giftContext,
          liveSessionId: liveSid && liveSid.length > 0 ? liveSid : null,
        },
      });

      const now = new Date();

      if (giftContext === 'CHALLENGE') {
        await tx.videoSupportStats.upsert({
          where: { videoId },
          create: {
            videoId,
            totalSuperVotes: 0,
            totalCoinsEarned: coinAmount,
            updatedAt: now,
          },
          update: {
            totalCoinsEarned: { increment: coinAmount },
            updatedAt: now,
          },
        });
      } else {
        const prevStats = await tx.videoSupportStats.findUnique({ where: { videoId } });
        let newVelocity = coinAmount;
        if (prevStats?.lastGiftVelocityAt) {
          newVelocity = decayVelocity(prevStats.recentGiftVelocity ?? 0, prevStats.lastGiftVelocityAt, now) + coinAmount;
        }
        await tx.videoSupportStats.upsert({
          where: { videoId },
          create: {
            videoId,
            totalSuperVotes: 0,
            totalCoinsEarned: 0,
            forYouGiftCoinsTotal: coinAmount,
            recentGiftVelocity: newVelocity,
            lastGiftVelocityAt: now,
            updatedAt: now,
          },
          update: {
            forYouGiftCoinsTotal: { increment: coinAmount },
            recentGiftVelocity: newVelocity,
            lastGiftVelocityAt: now,
            updatedAt: now,
          },
        });
      }

      await tx.coinTransaction.update({
        where: { id: debitResult.coinTransactionId },
        data: { description: `GiftTx:${giftTransaction.id}` },
      });

      await tx.user.update({
        where: { id: senderId },
        data: { totalCoinsSpent: { increment: coinAmount } },
      });

      await tx.creatorEarningsLedger.create({
        data: {
          creatorId: video.creatorId,
          sourceType: 'GIFT_TRANSACTION',
          sourceId: giftTransaction.id,
          grossCoins: coinAmount,
          creatorShareCoins,
        },
      });

      await tx.creatorEarningsSummary.upsert({
        where: { creatorId: video.creatorId },
        create: {
          creatorId: video.creatorId,
          availableEarningsCoins: creatorShareCoins,
          totalEarningsCoins: creatorShareCoins,
          totalGiftsReceivedCount: 1,
          pendingPayoutCoins: 0,
        },
        update: {
          availableEarningsCoins: { increment: creatorShareCoins },
          totalEarningsCoins: { increment: creatorShareCoins },
          totalGiftsReceivedCount: { increment: 1 },
        },
      });

      await tx.platformRevenueLedger.create({
        data: {
          sourceType: 'GIFT_TRANSACTION',
          sourceId: giftTransaction.id,
          grossCoins: coinAmount,
          platformShareCoins,
        },
      });

      const updatedVideo = await tx.video.update({
        where: { id: videoId },
        data: {
          coinsCount: { increment: coinAmount },
          giftsCount: { increment: 1 },
        },
        select: { coinsCount: true, giftsCount: true },
      });

      await tx.videoGiftTypeSummary.upsert({
        where: {
          videoId_giftId: { videoId, giftId: gift.id },
        },
        create: { videoId, giftId: gift.id, count: 1 },
        update: { count: { increment: 1 } },
      });

      const prevSup = await tx.videoSupporterSummary.findUnique({
        where: { videoId_userId: { videoId, userId: senderId } },
      });
      let sessionStreak = 1;
      if (
        prevSup?.lastStreakAt &&
        now.getTime() - prevSup.lastStreakAt.getTime() <= GIFT_STREAK_WINDOW_MS
      ) {
        sessionStreak = (prevSup.sessionStreakCount ?? 0) + 1;
      }
      await tx.videoSupporterSummary.upsert({
        where: {
          videoId_userId: { videoId, userId: senderId },
        },
        create: {
          videoId,
          userId: senderId,
          totalCoinsSent: coinAmount,
          giftsCount: 1,
          sessionStreakCount: sessionStreak,
          lastStreakAt: now,
        },
        update: {
          totalCoinsSent: { increment: coinAmount },
          giftsCount: { increment: 1 },
          sessionStreakCount: sessionStreak,
          lastStreakAt: now,
        },
      });

      await tx.creatorSupporterSummary.upsert({
        where: {
          creatorId_userId: { creatorId: video.creatorId, userId: senderId },
        },
        create: {
          creatorId: video.creatorId,
          userId: senderId,
          totalCoinsSent: coinAmount,
          giftsCount: 1,
        },
        update: {
          totalCoinsSent: { increment: coinAmount },
          giftsCount: { increment: 1 },
        },
      });

      await tx.user.update({
        where: { id: video.creatorId },
        data: { totalCoinsReceived: { increment: coinAmount } },
      });

      const { year, week } = getISOWeek(now);
      await tx.creatorSupportWeekly.upsert({
        where: {
          creatorId_year_week: { creatorId: video.creatorId, year, week },
        },
        create: {
          creatorId: video.creatorId,
          year,
          week,
          totalCoinsReceived: coinAmount,
          giftsCount: 1,
        },
        update: {
          totalCoinsReceived: { increment: coinAmount },
          giftsCount: { increment: 1 },
        },
      });

      if (await isNewAccount(tx, senderId)) {
        await recordAbuseFlag(tx, {
          giftTransactionId: giftTransaction.id,
          senderId,
          receiverId: video.creatorId,
          videoId,
          kind: 'NEW_ACCOUNT_GIFT',
          details: 'Account age < 24h',
        });
      }

      const topRow = await tx.videoSupporterSummary.findFirst({
        where: { videoId },
        orderBy: { totalCoinsSent: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, username: true } },
        },
      });
      const topSupporter = topRow
        ? {
            userId: topRow.user.id,
            displayName: topRow.user.displayName || topRow.user.username,
            totalCoinsSent: topRow.totalCoinsSent,
          }
        : null;

      if (idempotencyKey?.trim()) {
        const responseBody = JSON.stringify({
          ok: true,
          message: 'Gift sent',
          giftTransactionId: giftTransaction.id,
          coinAmount,
          senderNewBalance: debitResult.newBalance,
          sessionStreak,
          resolvedContext: giftContext,
          topSupporter,
          video: {
            coinsCount: updatedVideo.coinsCount,
            giftsCount: updatedVideo.giftsCount,
          },
        });
        await saveIdempotency(tx, idempotencyKey.trim(), senderId, responseBody);
      }

      return {
        success: true,
        giftTransactionId: giftTransaction.id,
        coinAmount,
        creatorShareCoins,
        platformShareCoins,
        senderNewBalance: debitResult.newBalance,
        videoCoinsCount: updatedVideo.coinsCount,
        videoGiftsCount: updatedVideo.giftsCount,
        sessionStreak,
        resolvedContext: giftContext,
        topSupporter,
      };
    },
    { timeout: 10_000 }
  );

  return result;
}
