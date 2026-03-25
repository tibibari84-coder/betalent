import type { CoinTransactionType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Wallet service: wallet balance and coin transaction history only.
 *
 * - **Wallet balance:** UserWallet (coinBalance, totalCoinsPurchased, totalCoinsSpent) is the single
 *   source of spendable coins. Updated only via debit/credit in this service.
 * - **Transaction history:** CoinTransaction is the audit log for all wallet movements (PURCHASE,
 *   GIFT_SENT, REFUND, BONUS, etc.). Written only here. Not mixed with likes, votes, or gift logic.
 */

export interface WalletSummary {
  coinBalance: number;
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  lifetimeEarned: number;
  lastDailyBonusClaimAt: Date | null;
}

export interface DebitOptions {
  type: CoinTransactionType;
  toUserId?: string | null;
  videoId?: string | null;
  referenceId?: string | null;
  description?: string | null;
}

export interface CreditOptions {
  type: CoinTransactionType;
  referenceId?: string | null;
  description?: string | null;
}

/**
 * Returns the user's wallet, creating one if it does not exist.
 * Use after auth to ensure every user has a wallet.
 */
export async function getOrCreateWallet(userId: string): Promise<WalletSummary> {
  const wallet = await prisma.userWallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return toSummary(wallet);
}

function toSummary(w: { coinBalance: number; totalCoinsPurchased: number; totalCoinsSpent: number; lifetimeEarned: number; lastDailyBonusClaimAt: Date | null }) {
  return {
    coinBalance: w.coinBalance,
    totalCoinsPurchased: w.totalCoinsPurchased,
    totalCoinsSpent: w.totalCoinsSpent,
    lifetimeEarned: w.lifetimeEarned,
    lastDailyBonusClaimAt: w.lastDailyBonusClaimAt,
  };
}

/**
 * Returns current wallet summary for the user. Does not create a wallet.
 */
export async function getBalance(userId: string): Promise<WalletSummary | null> {
  const wallet = await prisma.userWallet.findUnique({
    where: { userId },
  });
  if (!wallet) return null;
  return toSummary(wallet);
}

export type DebitResult =
  | { ok: true; newBalance: number; coinTransactionId: string }
  | { ok: false; reason: string };

/**
 * Debits the user's wallet inside an existing transaction. Use from gift/purchase flows
 * so debit and related records are committed atomically. Fails if balance would go negative.
 * Returns the created CoinTransaction id so callers (e.g. gift.service) can link wallet
 * transaction history to gift transactions.
 */
export async function debitInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  options: DebitOptions
): Promise<DebitResult> {
  if (amount <= 0) return { ok: false, reason: 'Invalid amount' };

  const description =
    options.description ?? (options.referenceId ? `Ref: ${options.referenceId}` : null);

  // Atomic spend guard: decrement only when current balance is sufficient.
  const decremented = await tx.userWallet.updateMany({
    where: {
      userId,
      coinBalance: { gte: amount },
    },
    data: {
      coinBalance: { decrement: amount },
      totalCoinsSpent: { increment: amount },
    },
  });

  if (decremented.count === 0) {
    const wallet = await tx.userWallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    return wallet
      ? { ok: false, reason: 'Insufficient balance' }
      : { ok: false, reason: 'Wallet not found' };
  }

  const coinTx = await tx.coinTransaction.create({
    data: {
      fromUserId: userId,
      toUserId: options.toUserId ?? null,
      videoId: options.videoId ?? null,
      type: options.type,
      amount,
      description,
    },
  });

  const updated = await tx.userWallet.findUniqueOrThrow({
    where: { userId },
    select: { coinBalance: true },
  });

  return { ok: true, newBalance: updated.coinBalance, coinTransactionId: coinTx.id };
}

/**
 * Debits the user's wallet (e.g. spend on a gift). Atomic with audit record.
 * Fails if balance would go negative. For gift send, use gift.service which runs debit inside its own transaction.
 */
export async function debit(
  userId: string,
  amount: number,
  options: DebitOptions
): Promise<{ success: true; newBalance: number } | { success: false; reason: string }> {
  if (amount <= 0) {
    return { success: false, reason: 'Invalid amount' };
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return debitInTransaction(tx, userId, amount, options);
  });

  if (!result.ok) {
    return { success: false, reason: result.reason };
  }
  return { success: true, newBalance: result.newBalance };
}

/**
 * Credits the user's wallet (e.g. purchase, refund, bonus). Atomic with audit record.
 */
export async function credit(
  userId: string,
  amount: number,
  options: CreditOptions
): Promise<{ success: true; newBalance: number } | { success: false; reason: string }> {
  if (amount <= 0) {
    return { success: false, reason: 'Invalid amount' };
  }

  const description =
    options.description ?? (options.referenceId ? `Ref: ${options.referenceId}` : null);
  const isPurchase = options.type === 'PURCHASE';

  const earnsLifetime = ['DAILY_BONUS', 'VIDEO_UPLOAD_REWARD', 'RECEIVED_VOTES', 'CHALLENGE_REWARD', 'BONUS', 'ADMIN_ADJUSTMENT'].includes(options.type);

  let result: { ok: true; newBalance: number };
  try {
    result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          coinBalance: amount,
          totalCoinsPurchased: isPurchase ? amount : 0,
          totalCoinsSpent: 0,
          lifetimeEarned: earnsLifetime ? amount : 0,
        },
        update: {
          coinBalance: { increment: amount },
          ...(isPurchase && { totalCoinsPurchased: { increment: amount } }),
          ...(earnsLifetime && { lifetimeEarned: { increment: amount } }),
        },
      });

      await tx.coinTransaction.create({
        data: {
          fromUserId: null,
          toUserId: userId,
          type: options.type,
          amount,
          referenceId: options.referenceId ?? null,
          description,
        },
      });

      const wallet = await tx.userWallet.findUniqueOrThrow({ where: { userId } });
      return { ok: true as const, newBalance: wallet.coinBalance };
    });
  } catch (error) {
    // If referenceId is unique and already written, credit was already applied.
    if (
      options.referenceId &&
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      const wallet = await prisma.userWallet.findUnique({
        where: { userId },
        select: { coinBalance: true },
      });
      return { success: true, newBalance: wallet?.coinBalance ?? 0 };
    }
    throw error;
  }

  // credit() transaction only returns ok: true; failure would throw
  return { success: true, newBalance: result.newBalance };
}

/**
 * Claim daily bonus once per calendar day (UTC). Idempotent per day.
 */
export async function claimDailyBonus(userId: string, amount: number): Promise<
  | { success: true; newBalance: number }
  | { success: false; reason: 'already_claimed' | 'wallet_not_found' }
> {
  const wallet = await prisma.userWallet.findUnique({ where: { userId } });
  if (!wallet) return { success: false, reason: 'wallet_not_found' };

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (wallet.lastDailyBonusClaimAt) {
    const claimDay = new Date(Date.UTC(
      wallet.lastDailyBonusClaimAt.getUTCFullYear(),
      wallet.lastDailyBonusClaimAt.getUTCMonth(),
      wallet.lastDailyBonusClaimAt.getUTCDate()
    ));
    if (claimDay.getTime() === today.getTime()) {
      return { success: false, reason: 'already_claimed' };
    }
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.userWallet.update({
      where: { userId },
      data: {
        coinBalance: { increment: amount },
        lifetimeEarned: { increment: amount },
        lastDailyBonusClaimAt: now,
      },
    });
    await tx.coinTransaction.create({
      data: {
        fromUserId: null,
        toUserId: userId,
        type: 'DAILY_BONUS',
        amount,
        description: 'Daily login bonus',
      },
    });
    const w = await tx.userWallet.findUniqueOrThrow({ where: { userId } });
    return { newBalance: w.coinBalance };
  });

  return { success: true, newBalance: result.newBalance };
}
