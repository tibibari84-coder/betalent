import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  AdminCoinPackageView,
  AdminGiftCatalogView,
  AdminGiftTransactionLogEntry,
  AdminCreatorEarningsView,
  AdminSuspiciousGiftingFlag,
  AdminHighVolumeSupporter,
  AdminPlatformRevenueView,
  AdminGiftAbuseFlagEntry,
} from '@/types/admin-visibility';

/**
 * Admin visibility layer: read-only queries for coin and gift system inspection.
 * All functions are intended for use behind requireAdmin() only.
 */

function toDateStr(d: Date): string {
  return d.toISOString();
}

/** Coin packages: full catalog including inactive, for admin inspection. */
export async function listCoinPackagesAdmin(): Promise<AdminCoinPackageView[]> {
  const rows = await prisma.coinPackage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((p) => ({
    id: p.id,
    internalName: p.internalName,
    name: p.name,
    coins: p.coins,
    bonusCoins: p.bonusCoins,
    price: p.price.toString(),
    currency: p.currency,
    isActive: p.isActive,
    isPromotional: p.isPromotional,
    validFrom: p.validFrom ? toDateStr(p.validFrom) : null,
    validUntil: p.validUntil ? toDateStr(p.validUntil) : null,
    sortOrder: p.sortOrder,
    createdAt: toDateStr(p.createdAt),
    updatedAt: toDateStr(p.updatedAt),
  }));
}

/** Gift catalog: all gifts including inactive. */
export async function listGiftCatalogAdmin(): Promise<AdminGiftCatalogView[]> {
  const rows = await prisma.gift.findMany({
    orderBy: [{ rarityTier: 'asc' }, { coinCost: 'asc' }],
  });
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    icon: g.icon,
    animationType: g.animationType,
    coinCost: g.coinCost,
    rarityTier: g.rarityTier,
    isActive: g.isActive,
    createdAt: toDateStr(g.createdAt),
  }));
}

/** Gift transaction logs: paginated, with sender/receiver/video/gift details. */
export async function getGiftTransactionLogs(options: {
  limit?: number;
  cursor?: string;
  since?: Date;
  until?: Date;
  senderId?: string;
  receiverId?: string;
}): Promise<{
  entries: AdminGiftTransactionLogEntry[];
  nextCursor: string | null;
}> {
  const limit = Math.min(options.limit ?? 50, 100);
  const where: Prisma.GiftTransactionWhereInput = {};
  if (options.since || options.until) {
    where.createdAt = {};
    if (options.since) (where.createdAt as Record<string, Date>).gte = options.since;
    if (options.until) (where.createdAt as Record<string, Date>).lte = options.until;
  }
  if (options.senderId) where.senderId = options.senderId;
  if (options.receiverId) where.receiverId = options.receiverId;

  const rows = await prisma.giftTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { username: true, displayName: true } },
      receiver: { select: { username: true, displayName: true } },
      video: { select: { title: true } },
      gift: { select: { name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const entries = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    senderId: r.senderId,
    senderUsername: r.sender.username,
    senderDisplayName: r.sender.displayName,
    receiverId: r.receiverId,
    receiverUsername: r.receiver.username,
    receiverDisplayName: r.receiver.displayName,
    videoId: r.videoId,
    videoTitle: r.video?.title ?? null,
    giftId: r.giftId,
    giftName: r.gift.name,
    coinAmount: r.coinAmount,
    creatorShareCoins: r.creatorShareCoins,
    platformShareCoins: r.platformShareCoins,
    status: r.status,
    createdAt: toDateStr(r.createdAt),
  }));

  return {
    entries,
    nextCursor: hasMore ? entries[entries.length - 1].id : null,
  };
}

/** Creator earnings summaries: all creators with an earnings summary. */
export async function getCreatorEarningsSummaries(options?: {
  limit?: number;
  minEarnings?: number;
}): Promise<AdminCreatorEarningsView[]> {
  const limit = Math.min(options?.limit ?? 100, 200);
  const where: Prisma.CreatorEarningsSummaryWhereInput = {};
  if (options?.minEarnings != null) {
    where.totalEarningsCoins = { gte: options.minEarnings };
  }

  const rows = await prisma.creatorEarningsSummary.findMany({
    where,
    orderBy: { totalEarningsCoins: 'desc' },
    take: limit,
    include: {
      creator: { select: { username: true, displayName: true } },
    },
  });

  return rows.map((r) => ({
    creatorId: r.creatorId,
    username: r.creator.username,
    displayName: r.creator.displayName,
    availableEarningsCoins: r.availableEarningsCoins,
    totalEarningsCoins: r.totalEarningsCoins,
    totalGiftsReceivedCount: r.totalGiftsReceivedCount,
    pendingPayoutCoins: r.pendingPayoutCoins,
    updatedAt: toDateStr(r.updatedAt),
  }));
}

/**
 * Suspicious gifting behavior: simple heuristics.
 * - high_frequency_pair: same sender→receiver count in a time window
 * - large_single_transaction: single tx above threshold
 * - burst_activity: many transactions from same sender in short window
 */
export async function getSuspiciousGiftingFlags(options: {
  since?: Date;
  highFrequencyMinCount?: number;
  highFrequencyWindowMinutes?: number;
  largeTransactionMinCoins?: number;
  burstMinCount?: number;
  burstWindowMinutes?: number;
}): Promise<AdminSuspiciousGiftingFlag[]> {
  const since = options.since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const flags: AdminSuspiciousGiftingFlag[] = [];

  const transactions = await prisma.giftTransaction.findMany({
    where: { createdAt: { gte: since }, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { username: true } },
      receiver: { select: { username: true } },
    },
  });

  const largeThreshold = options.largeTransactionMinCoins ?? 5000;
  for (const t of transactions) {
    if (t.coinAmount >= largeThreshold) {
      flags.push({
        kind: 'large_single_transaction',
        senderId: t.senderId,
        senderUsername: t.sender.username,
        receiverId: t.receiverId,
        receiverUsername: t.receiver.username,
        videoId: t.videoId,
        transactionId: t.id,
        coinAmount: t.coinAmount,
        createdAt: toDateStr(t.createdAt),
      });
    }
  }

  const pairCount = new Map<string, number>();
  const senderCount = new Map<string, number>();

  for (const t of transactions) {
    const key = `${t.senderId}:${t.receiverId}`;
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    senderCount.set(t.senderId, (senderCount.get(t.senderId) ?? 0) + 1);
  }

  const freqMin = options.highFrequencyMinCount ?? 5;
  for (const [key, count] of Array.from(pairCount.entries())) {
    if (count >= freqMin) {
      const [senderId, receiverId] = key.split(':');
      const t = transactions.find((x) => x.senderId === senderId && x.receiverId === receiverId);
      if (t) {
        flags.push({
          kind: 'high_frequency_pair',
          senderId: t.senderId,
          senderUsername: t.sender.username,
          receiverId: t.receiverId,
          receiverUsername: t.receiver.username,
          videoId: null,
          transactionId: null,
          coinAmount: 0,
          count,
          windowMinutes: options.highFrequencyWindowMinutes ?? 60,
          createdAt: toDateStr(t.createdAt),
        });
      }
    }
  }

  const burstMin = options.burstMinCount ?? 10;
  for (const [userId, count] of Array.from(senderCount.entries())) {
    if (count >= burstMin) {
      const t = transactions.find((x) => x.senderId === userId);
      if (t) {
        flags.push({
          kind: 'burst_activity',
          senderId: t.senderId,
          senderUsername: t.sender.username,
          receiverId: '',
          receiverUsername: '',
          videoId: null,
          transactionId: null,
          coinAmount: 0,
          count,
          windowMinutes: options.burstWindowMinutes ?? 30,
          createdAt: toDateStr(t.createdAt),
        });
      }
    }
  }

  return flags;
}

/** High-volume supporters: users ordered by totalCoinsSpent (admin view). */
export async function getHighVolumeSupporters(options?: {
  limit?: number;
  minCoinsSpent?: number;
}): Promise<AdminHighVolumeSupporter[]> {
  const limit = Math.min(options?.limit ?? 50, 100);
  const where: Prisma.UserWhereInput = {
    totalCoinsSpent: { gt: 0 },
  };
  if (options?.minCoinsSpent != null) {
    where.totalCoinsSpent = { gte: options.minCoinsSpent };
  }

  const rows = await prisma.user.findMany({
    where,
    orderBy: { totalCoinsSpent: 'desc' },
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      totalCoinsSpent: true,
      createdAt: true,
    },
  });

  return rows.map((u) => ({
    userId: u.id,
    username: u.username,
    displayName: u.displayName,
    totalCoinsSpent: u.totalCoinsSpent,
    createdAt: toDateStr(u.createdAt),
  }));
}

/** Platform revenue from gifts: totals from PlatformRevenueLedger (GIFT_TRANSACTION source). */
export async function getPlatformRevenueFromGifts(options?: {
  since?: Date;
  until?: Date;
}): Promise<AdminPlatformRevenueView> {
  const where: Prisma.PlatformRevenueLedgerWhereInput = {
    sourceType: 'GIFT_TRANSACTION',
  };
  if (options?.since || options?.until) {
    where.createdAt = {};
    if (options.since) where.createdAt.gte = options.since;
    if (options.until) where.createdAt.lte = options.until;
  }

  const rows = await prisma.platformRevenueLedger.findMany({
    where,
    select: {
      grossCoins: true,
      platformShareCoins: true,
      sourceId: true,
      createdAt: true,
    },
  });

  const totalPlatformShareCoins = rows.reduce((s, r) => s + r.platformShareCoins, 0);
  const totalGrossCoins = rows.reduce((s, r) => s + r.grossCoins, 0);
  const transactionCount = rows.length;

  const period =
    options?.since || options?.until
      ? {
          from: (options.since ?? new Date(0)).toISOString(),
          to: (options.until ?? new Date()).toISOString(),
        }
      : undefined;

  return {
    totalPlatformShareCoins,
    totalGrossCoins,
    transactionCount,
    fromGiftTransactions: transactionCount,
    period,
  };
}

/** Gift abuse flags (anti-abuse layer): for moderation. */
export async function getGiftAbuseFlags(options?: {
  limit?: number;
  since?: Date;
  kind?: string;
  senderId?: string;
}): Promise<AdminGiftAbuseFlagEntry[]> {
  const limit = Math.min(options?.limit ?? 100, 200);
  const where: Prisma.GiftAbuseFlagWhereInput = {};
  if (options?.since) where.createdAt = { gte: options.since };
  if (options?.kind) where.kind = options.kind as 'SELF_GIFT_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'RAPID_GIFTING' | 'HIGH_FREQUENCY_PAIR' | 'NEW_ACCOUNT_GIFT' | 'DUPLICATE_ATTEMPT' | 'SUSPICIOUS_PATTERN';
  if (options?.senderId) where.senderId = options.senderId;

  const rows = await prisma.giftAbuseFlag.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    giftTransactionId: r.giftTransactionId,
    senderId: r.senderId,
    receiverId: r.receiverId,
    videoId: r.videoId,
    kind: r.kind,
    details: r.details,
    createdAt: toDateStr(r.createdAt),
  }));
}
