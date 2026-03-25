import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type GiftAbuseFlagKindValue =
  | 'SELF_GIFT_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RAPID_GIFTING'
  | 'HIGH_FREQUENCY_PAIR'
  | 'NEW_ACCOUNT_GIFT'
  | 'DUPLICATE_ATTEMPT'
  | 'SUSPICIOUS_PATTERN';

/**
 * Anti-abuse for gift sending: server-side only, no client-trusted accounting.
 * All checks and flagging run inside the same transaction as the gift flow for integrity.
 */

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const PAIR_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const PAIR_LIMIT_MAX = 3;
const NEW_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export type IdempotencyResult =
  | { hit: true; responseBody: string }
  | { hit: false }
  | { conflict: true }; // key already used by another user

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; kind: 'RATE_LIMIT_EXCEEDED' | 'HIGH_FREQUENCY_PAIR' };

/** Returns stored response if key was already used by this user (replay); conflict if used by another user. */
export async function checkIdempotency(
  tx: Prisma.TransactionClient,
  key: string,
  userId: string
): Promise<IdempotencyResult> {
  if (!key || key.length > 256) return { hit: false };
  const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS);
  const row = await tx.giftIdempotencyKey.findUnique({
    where: { key },
  });
  if (!row) return { hit: false };
  if (row.userId !== userId) return { conflict: true };
  if (row.createdAt < cutoff) return { hit: false };
  return { hit: true, responseBody: row.responseBody };
}

/** Store idempotency key after successful send. Call only inside same tx. */
export async function saveIdempotency(
  tx: Prisma.TransactionClient,
  key: string,
  userId: string,
  responseBody: string
): Promise<void> {
  if (!key || key.length > 256) return;
  await tx.giftIdempotencyKey.create({
    data: { key, userId, responseBody },
  });
}

/** Rate limit: max N gifts per sender per minute; max M per (sender, receiver) per 5 min. */
export async function checkRateLimit(
  tx: Prisma.TransactionClient,
  senderId: string,
  receiverId: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
  const pairWindowStart = new Date(now.getTime() - PAIR_LIMIT_WINDOW_MS);

  const [senderCount, pairCount] = await Promise.all([
    tx.giftTransaction.count({
      where: {
        senderId,
        createdAt: { gte: windowStart },
        status: 'COMPLETED',
      },
    }),
    tx.giftTransaction.count({
      where: {
        senderId,
        receiverId,
        createdAt: { gte: pairWindowStart },
        status: 'COMPLETED',
      },
    }),
  ]);

  if (senderCount >= RATE_LIMIT_MAX_PER_WINDOW) {
    return {
      allowed: false,
      reason: `Too many gifts sent. Try again in a minute.`,
      kind: 'RATE_LIMIT_EXCEEDED',
    };
  }
  if (pairCount >= PAIR_LIMIT_MAX) {
    return {
      allowed: false,
      reason: `Too many gifts to this creator in a short time.`,
      kind: 'HIGH_FREQUENCY_PAIR',
    };
  }
  return { allowed: true };
}

/** True if sender account is newer than NEW_ACCOUNT_AGE_MS (for flagging only, not block). */
export async function isNewAccount(
  tx: Prisma.TransactionClient,
  senderId: string
): Promise<boolean> {
  const user = await tx.user.findUnique({
    where: { id: senderId },
    select: { createdAt: true },
  });
  if (!user) return false;
  const age = Date.now() - user.createdAt.getTime();
  return age < NEW_ACCOUNT_AGE_MS;
}

/** Record an abuse flag for moderation. Call inside same tx. */
export async function recordAbuseFlag(
  tx: Prisma.TransactionClient,
  payload: {
    giftTransactionId?: string | null;
    senderId: string;
    receiverId?: string | null;
    videoId?: string | null;
    kind: GiftAbuseFlagKindValue;
    details?: string | null;
  }
): Promise<void> {
  await tx.giftAbuseFlag.create({
    data: {
      giftTransactionId: payload.giftTransactionId ?? null,
      senderId: payload.senderId,
      receiverId: payload.receiverId ?? null,
      videoId: payload.videoId ?? null,
      kind: payload.kind,
      details: payload.details ?? null,
    },
  });
}

/** Detect duplicate attempt: same sender, same video, same gift, within last 30 seconds. */
export async function isLikelyDuplicate(
  tx: Prisma.TransactionClient,
  senderId: string,
  videoId: string,
  giftId: string
): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 1000);
  const count = await tx.giftTransaction.count({
    where: {
      senderId,
      videoId,
      giftId,
      createdAt: { gte: since },
      status: 'COMPLETED',
    },
  });
  return count > 0;
}
