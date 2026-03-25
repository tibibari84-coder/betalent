/**
 * BETALENT fraud risk – event logging, risk profile, payout block, and support review flags.
 *
 * Do not auto-ban on one weak signal. Use risk scoring; block/flag based on
 * thresholds (see constants/anti-cheat). Account linking signals (IP, device,
 * session) can be stored in FraudEvent.details (see lib/anti-cheat-architecture
 * ACCOUNT_LINKING_SIGNAL_KEYS) for later clustering and shouldFlagAsLinkedAccountSupport.
 *
 * - recordFraudEvent: log events; updates AccountRiskProfile (score, riskLevel, payoutBlocked).
 * - getConfirmedFraudSupportSourceIds: used by ranking and payout logic to exclude
 *   confirmed-fraud support from challenge/general ranking and (future) withdrawable balance.
 * - flagSupportForReview: create SupportReviewFlag (PENDING); trust team can set CONFIRMED_FRAUD
 *   or DISMISSED; CONFIRMED_FRAUD sourceIds are excluded via getConfirmedFraudSupportSourceIds.
 */

import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import type { FraudRiskLevel as PrismaRiskLevel } from '@prisma/client';
import {
  FraudRiskLevel as RiskLevelConst,
  RISK_SCORE_THRESHOLDS,
  BLOCK_SUPPORT_AT_RISK_LEVEL,
  PAYOUT_BLOCK_AT_RISK_LEVEL,
  LINKED_ACCOUNT_DETECTION_IMPLEMENTED,
  type FraudRiskLevelValue,
} from '@/constants/anti-cheat';

function scoreToLevel(score: number): PrismaRiskLevel {
  if (score >= RISK_SCORE_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= RISK_SCORE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RISK_SCORE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Record a fraud-related event. Optionally update AccountRiskProfile.
 */
export async function recordFraudEvent(params: {
  userId: string;
  eventType: string;
  riskLevel?: FraudRiskLevelValue;
  details?: object;
  sourceId?: string | null;
}): Promise<void> {
  const level = (params.riskLevel ?? 'LOW') as PrismaRiskLevel;
  await prisma.fraudEvent.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      riskLevel: level,
      details: params.details ?? undefined,
      sourceId: params.sourceId ?? undefined,
    },
  });
  await updateRiskProfileFromEvents(params.userId);
}

/**
 * Get or create AccountRiskProfile for user.
 */
export async function getOrCreateRiskProfile(userId: string) {
  return prisma.accountRiskProfile.upsert({
    where: { userId },
    create: { userId, fraudRiskScore: 0, riskLevel: 'LOW' },
    update: {},
  });
}

/**
 * Recompute fraudRiskScore and riskLevel from recent FraudEvents and suspiciousSupportCount.
 * Simple model: count events weighted by level, cap at 100.
 */
async function updateRiskProfileFromEvents(userId: string): Promise<void> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const events = await prisma.fraudEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { riskLevel: true },
  });
  const weights = { CRITICAL: 15, HIGH: 8, MEDIUM: 3, LOW: 1 } as const;
  let score = 0;
  for (const e of events) {
    score += weights[e.riskLevel] ?? 1;
  }
  const profile = await getOrCreateRiskProfile(userId);
  score = Math.min(100, score + profile.suspiciousSupportCount * 2);
  const riskLevel = scoreToLevel(score);
  const payoutBlocked = riskLevel === PAYOUT_BLOCK_AT_RISK_LEVEL || riskLevel === 'CRITICAL';
  await prisma.accountRiskProfile.update({
    where: { userId },
    data: {
      fraudRiskScore: score,
      riskLevel,
      payoutBlocked,
      lastFraudEventAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Whether this user's risk level should block support actions.
 */
export async function isSupportBlockedByRisk(userId: string): Promise<boolean> {
  const p = await getOrCreateRiskProfile(userId);
  return p.riskLevel === BLOCK_SUPPORT_AT_RISK_LEVEL || p.riskLevel === 'CRITICAL';
}

/**
 * Whether payout should be blocked for this user.
 */
export async function isPayoutBlocked(userId: string): Promise<boolean> {
  const p = await getOrCreateRiskProfile(userId);
  return p.payoutBlocked;
}

/**
 * Create a support review flag (suspicious support for trust team). Does not block the action by default.
 */
export async function flagSupportForReview(params: {
  userId: string;
  targetUserId: string;
  videoId?: string | null;
  type: 'GIFT' | 'SUPER_VOTE';
  sourceId?: string | null;
  reason?: string | null;
}): Promise<void> {
  await prisma.supportReviewFlag.create({
    data: {
      userId: params.userId,
      targetUserId: params.targetUserId,
      videoId: params.videoId ?? undefined,
      type: params.type,
      status: 'PENDING',
      sourceId: params.sourceId ?? undefined,
      reason: params.reason ?? undefined,
    },
  });
  await prisma.accountRiskProfile.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      fraudRiskScore: 0,
      riskLevel: 'LOW',
      suspiciousSupportCount: 1,
    },
    update: { suspiciousSupportCount: { increment: 1 }, updatedAt: new Date() },
  });
}

/**
 * Check if a support action (e.g. gift from userId to targetCreatorId) should be flagged as linked-account.
 * Intended to use account linking signals: IP similarity, device fingerprint, session similarity,
 * abnormal relationship graphs (see lib/anti-cheat-architecture ACCOUNT_LINKING_SIGNAL_KEYS).
 * When true, support-validation may allow but set flagForReview and create SupportReviewFlag.
 *
 * STATUS: NOT IMPLEMENTED. Linked-account detection is disabled. Real logic would require:
 * - IP/device capture in support flows (getClientIp, device fingerprint)
 * - Storage in FraudEvent.details (ipHash, deviceId) or dedicated SupportActionIpLog table
 * - Clustering job or query to detect same-IP/same-device support to same target from multiple accounts
 * - AccountRiskProfile.linkedAccountCount population (currently always 0)
 *
 * Set LINKED_ACCOUNT_DETECTION_IMPLEMENTED = true in constants/anti-cheat when ready.
 */
export async function shouldFlagAsLinkedAccountSupport(
  userId: string,
  targetUserId: string,
  signals?: { ip?: string | null; deviceId?: string | null; fingerprint?: string | null }
): Promise<boolean> {
  const signal = normalizeSignals(signals);
  if (!signal.ipHash && !signal.deviceId && !signal.fingerprintHash) {
    return false;
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recent = await prisma.fraudEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: ['SUPPORT_SIGNAL_SNAPSHOT', 'LINKED_ACCOUNT_SUPPORT', 'GIFT_CYCLING_DETECTED'] },
    },
    select: { userId: true, details: true },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  const linkedUsers = new Set<string>();
  for (const row of recent) {
    if (row.userId === userId) continue;
    const d = (row.details ?? {}) as Record<string, unknown>;
    const sameIp = signal.ipHash && d.ipHash === signal.ipHash;
    const sameDevice = signal.deviceId && d.deviceId === signal.deviceId;
    const sameFp = signal.fingerprintHash && d.fingerprintHash === signal.fingerprintHash;
    if (sameIp || sameDevice || sameFp) linkedUsers.add(row.userId);
  }

  if (linkedUsers.size === 0) return false;

  const relationSignals = await prisma.giftTransaction.count({
    where: {
      createdAt: { gte: since },
      status: 'COMPLETED',
      OR: [
        { senderId: { in: Array.from(linkedUsers) }, receiverId: targetUserId },
        { senderId: userId, receiverId: { in: Array.from(linkedUsers) } },
      ],
    },
  });

  await prisma.accountRiskProfile.upsert({
    where: { userId },
    create: {
      userId,
      fraudRiskScore: 0,
      riskLevel: 'LOW',
      linkedAccountCount: linkedUsers.size,
    },
    update: { linkedAccountCount: linkedUsers.size },
  });

  const suspicious = relationSignals > 0;
  if (suspicious) {
    await recordFraudEvent({
      userId,
      eventType: 'LINKED_ACCOUNT_SUPPORT',
      riskLevel: 'HIGH',
      details: {
        targetUserId,
        linkedAccountCount: linkedUsers.size,
        relationSignals,
        ipHash: signal.ipHash,
        deviceId: signal.deviceId,
        fingerprintHash: signal.fingerprintHash,
      },
    });
  }

  return suspicious || (LINKED_ACCOUNT_DETECTION_IMPLEMENTED && linkedUsers.size >= 2);
}

export function normalizeSignals(signals?: {
  ip?: string | null;
  deviceId?: string | null;
  fingerprint?: string | null;
}) {
  const ipHash = hash('ip', signals?.ip);
  const deviceId = clean(signals?.deviceId);
  const fingerprintHash = hash('fp', signals?.fingerprint);
  return { ipHash, deviceId, fingerprintHash };
}

export async function recordSupportSignalSnapshot(params: {
  userId: string;
  targetUserId?: string | null;
  actionType: 'GIFT' | 'SUPER_VOTE' | 'PURCHASE';
  ip?: string | null;
  deviceId?: string | null;
  fingerprint?: string | null;
}) {
  const signal = normalizeSignals({
    ip: params.ip,
    deviceId: params.deviceId,
    fingerprint: params.fingerprint,
  });
  if (!signal.ipHash && !signal.deviceId && !signal.fingerprintHash) return;
  await recordFraudEvent({
    userId: params.userId,
    eventType: 'SUPPORT_SIGNAL_SNAPSHOT',
    riskLevel: 'LOW',
    details: {
      actionType: params.actionType,
      targetUserId: params.targetUserId ?? null,
      ...signal,
    },
  });
}

export async function hasPurchaseVelocityRisk(params: {
  userId: string;
  ip?: string | null;
  deviceId?: string | null;
  fingerprint?: string | null;
  maxPerMinute?: number;
}) {
  const { userId } = params;
  const maxPerMinute = params.maxPerMinute ?? 25;
  const since = new Date(Date.now() - 60 * 1000);
  const orderCount = await prisma.coinPurchaseOrder.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (orderCount >= maxPerMinute) {
    await recordFraudEvent({
      userId,
      eventType: 'PURCHASE_VELOCITY_SPIKE',
      riskLevel: 'CRITICAL',
      details: { orderCount, windowSec: 60 },
    });
    return { blocked: true as const, reason: 'Velocity limit exceeded' };
  }

  const signal = normalizeSignals({
    ip: params.ip,
    deviceId: params.deviceId,
    fingerprint: params.fingerprint,
  });
  if (!signal.ipHash && !signal.deviceId && !signal.fingerprintHash) {
    return { blocked: false as const };
  }
  const recent = await prisma.fraudEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: ['PURCHASE_REQUEST', 'SUPPORT_SIGNAL_SNAPSHOT'] },
    },
    select: { userId: true, details: true },
    take: 500,
  });
  const distinctUsers = new Set<string>();
  for (const row of recent) {
    const d = (row.details ?? {}) as Record<string, unknown>;
    const sameIp = signal.ipHash && d.ipHash === signal.ipHash;
    const sameDevice = signal.deviceId && d.deviceId === signal.deviceId;
    const sameFp = signal.fingerprintHash && d.fingerprintHash === signal.fingerprintHash;
    if (sameIp || sameDevice || sameFp) distinctUsers.add(row.userId);
  }
  if (distinctUsers.size >= 5) {
    await recordFraudEvent({
      userId,
      eventType: 'DEVICE_CLUSTER_ABUSE',
      riskLevel: 'HIGH',
      details: { linkedUserCount: distinctUsers.size, windowSec: 60, ...signal },
    });
    return { blocked: true as const, reason: 'Suspicious multi-account purchase pattern' };
  }
  return { blocked: false as const };
}

export async function detectGiftCycling(params: {
  senderId: string;
  receiverId: string;
  windowHours?: number;
}) {
  const windowHours = params.windowHours ?? 24;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const [forward, backward] = await Promise.all([
    prisma.giftTransaction.count({
      where: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    }),
    prisma.giftTransaction.count({
      where: {
        senderId: params.receiverId,
        receiverId: params.senderId,
        status: 'COMPLETED',
        createdAt: { gte: since },
      },
    }),
  ]);
  const suspicious = forward >= 6 && backward >= 6;
  if (suspicious) {
    await Promise.all([
      recordFraudEvent({
        userId: params.senderId,
        eventType: 'GIFT_CYCLING_DETECTED',
        riskLevel: 'HIGH',
        details: { counterpartyId: params.receiverId, forward, backward, windowHours },
      }),
      recordFraudEvent({
        userId: params.receiverId,
        eventType: 'GIFT_CYCLING_DETECTED',
        riskLevel: 'HIGH',
        details: { counterpartyId: params.senderId, forward: backward, backward: forward, windowHours },
      }),
    ]);
  }
  return suspicious;
}

function clean(v?: string | null): string | null {
  const x = v?.trim();
  if (!x) return null;
  return x.slice(0, 160);
}

function hash(prefix: string, v?: string | null): string | null {
  const x = clean(v);
  if (!x) return null;
  return createHash('sha256').update(`${prefix}:${x}`).digest('hex').slice(0, 40);
}

/**
 * Returns sourceIds (GiftTransaction or CoinTransaction ids) that are confirmed fraud.
 * Use when aggregating support for challenge ranking or payout to exclude flagged support.
 */
export async function getConfirmedFraudSupportSourceIds(): Promise<Set<string>> {
  const flags = await prisma.supportReviewFlag.findMany({
    where: { status: 'CONFIRMED_FRAUD', sourceId: { not: null } },
    select: { sourceId: true },
  });
  const set = new Set<string>();
  flags.forEach((f) => f.sourceId && set.add(f.sourceId));
  return set;
}
