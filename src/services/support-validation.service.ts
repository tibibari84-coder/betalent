/**
 * BETALENT support validation – run before processing super vote, gift, or challenge support.
 *
 * Validation checks (see lib/anti-cheat-architecture): sufficient balance (caller),
 * not banned/suspended, not self-supporting (disallowed), not rate-limited,
 * not high-risk fraud (BLOCK_SUPPORT_AT_RISK_LEVEL). When risk is HIGH but below block,
 * allow but return flagForReview so caller can create SupportReviewFlag (PENDING).
 * Self-support attempts are rejected and recorded as FraudEvent (SELF_SUPPORT_ATTEMPT).
 */

import { prisma } from '@/lib/prisma';
import {
  SELF_SUPER_VOTE_DISALLOWED,
  SELF_GIFT_DISALLOWED,
  FLAG_FOR_REVIEW_AT_RISK_LEVEL,
  RATE_LIMIT_SUPER_VOTES_PER_HOUR,
  RATE_LIMIT_GIFTS_PER_HOUR,
  RATE_LIMIT_SUPPORT_ACTIONS_PER_HOUR,
  FRAUD_EVENT_TYPES,
} from '@/constants/anti-cheat';
import {
  getOrCreateRiskProfile,
  isSupportBlockedByRisk,
  recordFraudEvent,
  flagSupportForReview,
  shouldFlagAsLinkedAccountSupport,
  recordSupportSignalSnapshot,
  detectGiftCycling,
} from '@/services/fraud-risk.service';

export type SupportActionType = 'SUPER_VOTE' | 'GIFT';

export type ValidateSupportResult =
  | { allowed: true; flagForReview?: boolean }
  | { allowed: false; reason: string; code: string };

/**
 * Validate that a support action is allowed. Call before processing super vote or gift.
 * - Self-support (to own performance) is disallowed.
 * - CRITICAL risk blocks support.
 * - HIGH risk can still allow but flag for review.
 * - Rate limits enforced per user per hour.
 */
export async function validateSupportAction(params: {
  userId: string;
  actionType: SupportActionType;
  targetCreatorId: string;
  videoId?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  fingerprint?: string | null;
}): Promise<ValidateSupportResult> {
  const { userId, actionType, targetCreatorId, videoId, ip, deviceId, fingerprint } = params;

  await recordSupportSignalSnapshot({
    userId,
    targetUserId: targetCreatorId,
    actionType,
    ip,
    deviceId,
    fingerprint,
  });

  if (userId === targetCreatorId) {
    if (actionType === 'SUPER_VOTE' && SELF_SUPER_VOTE_DISALLOWED) {
      await recordFraudEvent({
        userId,
        eventType: FRAUD_EVENT_TYPES.SELF_SUPPORT_ATTEMPT,
        riskLevel: 'MEDIUM',
        details: { actionType, targetCreatorId, videoId: videoId ?? null },
      });
      return { allowed: false, reason: 'Cannot support your own performance', code: 'SELF_SUPPORT_DISALLOWED' };
    }
    if (actionType === 'GIFT' && SELF_GIFT_DISALLOWED) {
      await recordFraudEvent({
        userId,
        eventType: FRAUD_EVENT_TYPES.SELF_SUPPORT_ATTEMPT,
        riskLevel: 'MEDIUM',
        details: { actionType, targetCreatorId, videoId: videoId ?? null },
      });
      return { allowed: false, reason: 'Cannot gift your own performance', code: 'SELF_GIFT_DISALLOWED' };
    }
  }

  const blocked = await isSupportBlockedByRisk(userId);
  if (blocked) {
    return { allowed: false, reason: 'Account under review', code: 'FRAUD_RISK_BLOCK' };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (actionType === 'SUPER_VOTE') {
    const superVoteCount = await prisma.coinTransaction.count({
      where: {
        fromUserId: userId,
        type: 'SUPER_VOTE_SPENT',
        createdAt: { gte: since },
      },
    });
    if (superVoteCount >= RATE_LIMIT_SUPER_VOTES_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Too many super votes this hour. Try again later.',
        code: 'RATE_LIMIT_SUPER_VOTE',
      };
    }
  } else {
    const giftCount = await prisma.giftTransaction.count({
      where: {
        senderId: userId,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    });
    if (giftCount >= RATE_LIMIT_GIFTS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Too many gifts sent this hour. Try again later.',
        code: 'RATE_LIMIT_GIFT',
      };
    }
  }

  const totalSupportCount =
    (await prisma.coinTransaction.count({
      where: { fromUserId: userId, type: 'SUPER_VOTE_SPENT', createdAt: { gte: since } },
    })) +
    (await prisma.giftTransaction.count({
      where: { senderId: userId, status: 'COMPLETED', createdAt: { gte: since } },
    }));
  if (totalSupportCount >= RATE_LIMIT_SUPPORT_ACTIONS_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Too many support actions this hour. Try again later.',
      code: 'RATE_LIMIT_SUPPORT',
    };
  }

  const profile = await getOrCreateRiskProfile(userId);
  const flagForReview =
    (profile.riskLevel === FLAG_FOR_REVIEW_AT_RISK_LEVEL || profile.riskLevel === 'CRITICAL') &&
    profile.fraudRiskScore > 0;

  const linkedFlag = await shouldFlagAsLinkedAccountSupport(userId, targetCreatorId, {
    ip,
    deviceId,
    fingerprint,
  });
  if (linkedFlag) {
    return { allowed: true, flagForReview: true };
  }

  if (actionType === 'GIFT') {
    const cycle = await detectGiftCycling({ senderId: userId, receiverId: targetCreatorId });
    if (cycle) {
      await flagSupportForReview({
        userId,
        targetUserId: targetCreatorId,
        videoId,
        type: 'GIFT',
        reason: 'GIFT_CYCLING',
      });
      return {
        allowed: false,
        reason: 'Suspicious gifting pattern detected. Please try later.',
        code: 'SUSPICIOUS_GIFT_CYCLING',
      };
    }
  }

  return flagForReview ? { allowed: true, flagForReview: true } : { allowed: true };
}

/**
 * Call after a support action to optionally create a review flag (e.g. when flagForReview was true).
 */
export async function maybeFlagSupportForReview(params: {
  userId: string;
  targetUserId: string;
  videoId?: string | null;
  type: SupportActionType;
  sourceId?: string | null;
  reason?: string | null;
}): Promise<void> {
  await flagSupportForReview({
    userId: params.userId,
    targetUserId: params.targetUserId,
    videoId: params.videoId,
    type: params.type,
    sourceId: params.sourceId,
    reason: params.reason,
  });
}
