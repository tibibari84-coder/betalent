import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getById, getEffectiveCoins, isCurrentlyValid } from '@/services/coin-package.service';
import { applyPurchaseCreditInTransaction } from '@/services/wallet.service';
import type { CreatePurchaseIntentFn, PurchaseIntentResult } from '@/types/payment';

/**
 * Coin purchase flow: order creation + fulfillment.
 * Wallet logic is in wallet.service; we only credit when order is fulfilled (provider confirmed).
 * Payment provider is pluggable; no Stripe/PayPal here.
 */

export type CreateOrderResult =
  | { ok: true; orderId: string; status: 'PENDING'; intent: PurchaseIntentResult }
  | { ok: false; code: 'PACKAGE_NOT_FOUND' | 'PACKAGE_INACTIVE' | 'PACKAGE_INVALID'; message: string };

/** Provider used when creating the order; future Stripe flow will pass 'STRIPE'. */
export type PurchaseOrderProvider = 'MOCK' | 'STRIPE' | 'PAYPAL';

/**
 * Creates a purchase order (PENDING) and runs the provider's createIntent.
 * Does NOT credit the wallet. Wallet is credited only when fulfillOrder is called
 * (e.g. after Stripe webhook confirms payment).
 */
export async function createOrder(
  userId: string,
  packageId: string,
  createIntent: CreatePurchaseIntentFn,
  provider: PurchaseOrderProvider = 'MOCK'
): Promise<CreateOrderResult> {
  const pkg = await getById(packageId);
  if (!pkg) {
    return { ok: false, code: 'PACKAGE_NOT_FOUND', message: 'Coin package not found' };
  }
  if (!pkg.isActive) {
    return { ok: false, code: 'PACKAGE_INACTIVE', message: 'Package is not available' };
  }
  if (!isCurrentlyValid(pkg)) {
    return { ok: false, code: 'PACKAGE_INVALID', message: 'Package is outside its validity window' };
  }

  if (process.env.NODE_ENV === 'production' && provider === 'STRIPE' && !(pkg.stripePriceId?.trim())) {
    return {
      ok: false,
      code: 'PACKAGE_INVALID',
      message: 'Package is not available for purchase',
    };
  }

  const coins = pkg.effectiveCoins;
  const amountCents = Math.round(Number(pkg.price) * 100);

  const order = await prisma.coinPurchaseOrder.create({
    data: {
      userId,
      coinPackageId: packageId,
      coins,
      amountCents,
      currency: pkg.currency,
      status: 'PENDING',
      provider,
    },
    select: { id: true },
  });

  const intent = await createIntent({
    orderId: order.id,
    userId,
    amountCents,
    currency: pkg.currency,
    coins,
    packageInternalName: pkg.internalName,
    stripePriceId: pkg.stripePriceId,
  });

  return {
    ok: true,
    orderId: order.id,
    status: 'PENDING',
    intent,
  };
}

export type FulfillOrderResult =
  | { ok: true; newBalance: number }
  | { ok: false; code: 'ORDER_NOT_FOUND' | 'ORDER_ALREADY_FULFILLED' | 'ORDER_FAILED'; message: string };

/**
 * Marks order COMPLETED and credits the user's wallet. Idempotent for same order.
 * Call this when the payment provider confirms payment (e.g. Stripe webhook).
 * Credits are applied in a single DB transaction with row-level locking; amounts come from the order row only.
 */
export async function fulfillOrder(orderId: string): Promise<FulfillOrderResult> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; userId: string; coins: number; status: string }>
      >(
        Prisma.sql`
          SELECT id, "userId", coins, status::text AS status
          FROM "CoinPurchaseOrder"
          WHERE id = ${orderId}
          FOR UPDATE
        `
      );
      const row = rows[0];
      if (!row) {
        return { kind: 'NOT_FOUND' as const };
      }
      if (row.status === 'COMPLETED') {
        const wallet = await tx.userWallet.findUnique({
          where: { userId: row.userId },
          select: { coinBalance: true },
        });
        return { kind: 'DONE' as const, newBalance: wallet?.coinBalance ?? 0 };
      }
      if (row.status !== 'PENDING') {
        return { kind: 'BAD_STATUS' as const, status: row.status };
      }

      const desc = `Coin purchase order ${row.id}`;
      const creditResult = await applyPurchaseCreditInTransaction(
        tx,
        row.userId,
        row.coins,
        row.id,
        desc
      );
      if (!creditResult.ok) {
        throw new Error(creditResult.reason);
      }

      await tx.coinPurchaseOrder.update({
        where: { id: orderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      return { kind: 'DONE' as const, newBalance: creditResult.newBalance };
    });

    if (outcome.kind === 'NOT_FOUND') {
      return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' };
    }
    if (outcome.kind === 'BAD_STATUS') {
      if (outcome.status === 'FAILED' || outcome.status === 'REFUNDED') {
        return {
          ok: false,
          code: 'ORDER_FAILED',
          message: `Order is ${outcome.status}`,
        };
      }
      return {
        ok: false,
        code: 'ORDER_FAILED',
        message: `Order is ${outcome.status}`,
      };
    }
    return { ok: true, newBalance: outcome.newBalance };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    return {
      ok: false,
      code: 'ORDER_FAILED',
      message: msg || 'Fulfillment failed',
    };
  }
}

/**
 * Fulfill by provider reference (e.g. Stripe payment_intent.id). Used by webhooks.
 */
export async function fulfillOrderByProviderRef(
  provider: 'MOCK' | 'STRIPE' | 'PAYPAL',
  providerReferenceId: string
): Promise<FulfillOrderResult> {
  const order = await prisma.coinPurchaseOrder.findFirst({
    where: { provider, providerReferenceId },
    select: { id: true },
  });
  if (!order) {
    return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found for provider reference' };
  }
  return fulfillOrder(order.id);
}

export async function markOrderFailedByProviderRef(
  provider: 'MOCK' | 'STRIPE' | 'PAYPAL',
  providerReferenceId: string
): Promise<{ ok: true } | { ok: false; code: 'ORDER_NOT_FOUND' }> {
  const order = await prisma.coinPurchaseOrder.findFirst({
    where: { provider, providerReferenceId },
    select: { id: true, status: true },
  });
  if (!order) return { ok: false, code: 'ORDER_NOT_FOUND' };
  if (order.status === 'COMPLETED' || order.status === 'REFUNDED') return { ok: true };
  await prisma.coinPurchaseOrder.update({
    where: { id: order.id },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      // keep reason in webhook ledger, not schema field
    },
  });
  return { ok: true };
}

export async function markOrderRefundedByProviderRef(
  provider: 'MOCK' | 'STRIPE' | 'PAYPAL',
  providerReferenceId: string
): Promise<{ ok: true } | { ok: false; code: 'ORDER_NOT_FOUND' }> {
  const order = await prisma.coinPurchaseOrder.findFirst({
    where: { provider, providerReferenceId },
    select: { id: true, status: true },
  });
  if (!order) return { ok: false, code: 'ORDER_NOT_FOUND' };
  if (order.status === 'REFUNDED') return { ok: true };
  await prisma.coinPurchaseOrder.update({
    where: { id: order.id },
    data: { status: 'REFUNDED', completedAt: new Date() },
  });
  return { ok: true };
}
