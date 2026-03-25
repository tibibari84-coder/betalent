/**
 * Payout preparation service. No real payouts or provider integration.
 * Server-side eligibility, withdrawable balance, threshold, and readiness state only.
 *
 * Anti-cheat hooks:
 * - isPayoutBlocked(userId) from fraud-risk.service: when AccountRiskProfile.payoutBlocked
 *   (e.g. risk level HIGH/CRITICAL), readiness is under_review or blocked.
 * - Future: exclude support from getConfirmedFraudSupportSourceIds() when computing
 *   eligible/withdrawable coins so confirmed-fraud gifts do not count (lib/anti-cheat-architecture).
 */

import { prisma } from '@/lib/prisma';
import { PAYOUT_MINIMUM_COINS } from '@/constants/payout';
import { isPayoutBlocked } from '@/services/fraud-risk.service';
import type { PayoutProfileStatus, PayoutVerificationStatus } from '@prisma/client';

export type WithdrawableBalance = {
  /** Coins eligible for future withdrawal (after hold, not under review). */
  eligibleCoins: number;
  /** Coins in hold window or under review; not yet withdrawable. */
  pendingCoins: number;
  /** Total that could become withdrawable (eligible + pending). */
  totalAccruedCoins: number;
  /** Total already withdrawn (from CreatorPayoutRecord PAID). Future use. */
  totalWithdrawnCoins: number;
};

export type PayoutReadinessState =
  | 'set_up_payout_method'
  | 'verification_required'
  | 'threshold_not_reached'
  | 'ready_for_future_payouts'
  | 'under_review'
  | 'blocked';

export type PayoutProfileReadiness = {
  profileStatus: PayoutProfileStatus;
  verificationStatus: PayoutVerificationStatus;
  payoutMethodConfigured: boolean;
  minimumThresholdMet: boolean;
  eligibleCoins: number;
  pendingCoins: number;
  minimumRequiredCoins: number;
  readinessState: PayoutReadinessState;
  message: string;
};

/**
 * Get or create creator payout profile. Defaults to NOT_SET_UP, NOT_STARTED.
 */
export async function getOrCreatePayoutProfile(userId: string) {
  return prisma.creatorPayoutProfile.upsert({
    where: { userId },
    create: {
      userId,
      status: 'NOT_SET_UP',
      verificationStatus: 'NOT_STARTED',
      payoutMethodType: 'NOT_CONFIGURED',
      payoutMethodConfigured: false,
      minimumThresholdMet: false,
    },
    update: {},
  });
}

/**
 * Server-calculated withdrawable balance. Uses dashboard summary (creator-dashboard.service):
 * - eligibleCoins = estimated withdrawable (lifetime minus pending; support outside hold window only).
 * - pendingCoins = support in hold window; never presented as withdrawable.
 * Do not present all support as instantly withdrawable.
 */
export async function getWithdrawableBalance(
  userId: string,
  estimatedWithdrawableFromDashboard: number,
  pendingCoinsFromDashboard: number
): Promise<WithdrawableBalance> {
  const totalPaid = await prisma.creatorPayoutRecord.aggregate({
    where: { userId, status: 'PAID' },
    _sum: { amountCoins: true },
  });
  const totalWithdrawnCoins = totalPaid._sum.amountCoins ?? 0;
  const eligibleCoins = Math.max(0, estimatedWithdrawableFromDashboard);

  return {
    eligibleCoins,
    pendingCoins: pendingCoinsFromDashboard,
    totalAccruedCoins: eligibleCoins + pendingCoinsFromDashboard,
    totalWithdrawnCoins,
  };
}

/**
 * Whether the creator has met the minimum payout threshold. Configurable via PAYOUT_MINIMUM_COINS.
 */
export function isAboveMinimumThreshold(eligibleCoins: number): boolean {
  return eligibleCoins >= PAYOUT_MINIMUM_COINS;
}

/**
 * Payout readiness state for UI. Server-calculated; do not trust client.
 * Order: blocked > under_review > not set up > verification required > threshold not reached > ready.
 */
export async function getPayoutReadiness(
  userId: string,
  eligibleCoinsFromDashboard: number,
  pendingCoinsFromDashboard: number
): Promise<PayoutProfileReadiness> {
  const profile = await getOrCreatePayoutProfile(userId);
  const thresholdMet = isAboveMinimumThreshold(eligibleCoinsFromDashboard);
  const fraudBlocked = await isPayoutBlocked(userId);
  const riskHold = await prisma.creatorEarningsRiskHold.aggregate({
    where: { creatorId: userId, status: { in: ['PENDING', 'PARTIAL', 'BLOCKED'] } },
    _sum: { atRiskCoins: true },
  });
  const unsettledDisputeCoins = riskHold._sum.atRiskCoins ?? 0;
  const effectiveEligibleCoins = Math.max(0, eligibleCoinsFromDashboard - unsettledDisputeCoins);

  await prisma.creatorPayoutProfile.update({
    where: { userId },
    data: { minimumThresholdMet: thresholdMet },
  });

  let readinessState: PayoutReadinessState = 'set_up_payout_method';
  let message = 'Set up payout method when available.';

  if (fraudBlocked) {
    readinessState = 'blocked';
    message = 'Payout is not available. Contact support.';
  } else if (profile.status === 'BLOCKED') {
    readinessState = 'blocked';
    message = 'Payout account is blocked. Contact support.';
  } else if (profile.status === 'UNDER_REVIEW') {
    readinessState = 'under_review';
    message = 'Your account is under review. Payout will be available when complete.';
  } else if (!profile.payoutMethodConfigured) {
    readinessState = 'set_up_payout_method';
    message = 'Set up payout method when payout is enabled.';
  } else if (
    profile.verificationStatus === 'PENDING' ||
    profile.verificationStatus === 'REQUIRES_REVIEW' ||
    profile.verificationStatus === 'NOT_STARTED'
  ) {
    readinessState = 'verification_required';
    message = 'Verification required before payout.';
  } else if (profile.verificationStatus === 'REJECTED') {
    readinessState = 'verification_required';
    message = 'Verification was not approved. Please try again when payout is available.';
  } else if (unsettledDisputeCoins > 0) {
    readinessState = 'under_review';
    message = `Earnings impacted by refund/dispute review (${unsettledDisputeCoins.toLocaleString()} coins unsettled).`;
  } else if (!thresholdMet) {
    readinessState = 'threshold_not_reached';
    message = `Reach ${PAYOUT_MINIMUM_COINS.toLocaleString()} coins to be eligible for payout.`;
  } else if (profile.status === 'READY' || profile.status === 'PENDING_VERIFICATION') {
    readinessState = 'ready_for_future_payouts';
    message = 'You are ready for payouts when we enable withdrawals.';
  }

  return {
    profileStatus: profile.status,
    verificationStatus: profile.verificationStatus,
    payoutMethodConfigured: profile.payoutMethodConfigured,
    minimumThresholdMet: isAboveMinimumThreshold(effectiveEligibleCoins),
    eligibleCoins: effectiveEligibleCoins,
    pendingCoins: pendingCoinsFromDashboard + unsettledDisputeCoins,
    minimumRequiredCoins: PAYOUT_MINIMUM_COINS,
    readinessState,
    message,
  };
}

/** Payout history preparation: returns records for future payout history UI. No real payouts executed yet. */
export type PayoutHistoryRow = {
  id: string;
  amountCoins: number;
  amountFiatEstimated: number | null;
  status: string;
  requestedAt: string;
  processedAt: string | null;
  payoutMethodType: string;
  referenceId: string | null;
};

export async function getPayoutHistory(userId: string, limit = 20): Promise<PayoutHistoryRow[]> {
  const records = await prisma.creatorPayoutRecord.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      amountCoins: true,
      amountFiatEstimated: true,
      status: true,
      requestedAt: true,
      processedAt: true,
      payoutMethodType: true,
      referenceId: true,
    },
  });
  return records.map((r) => ({
    id: r.id,
    amountCoins: r.amountCoins,
    amountFiatEstimated: r.amountFiatEstimated,
    status: r.status,
    requestedAt: r.requestedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
    payoutMethodType: r.payoutMethodType,
    referenceId: r.referenceId,
  }));
}