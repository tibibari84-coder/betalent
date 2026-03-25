import { prisma } from '@/lib/prisma';
import { getById, getEffectiveCoins, isCurrentlyValid } from '@/services/coin-package.service';
import { credit } from '@/services/wallet.service';
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
 * Wallet logic is delegated to wallet.service.credit; we do not trust client for amount.
 */
export async function fulfillOrder(orderId: string): Promise<FulfillOrderResult> {
  const order = await prisma.coinPurchaseOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, coins: true, status: true },
  });

  if (!order) {
    return { ok: false, code: 'ORDER_NOT_FOUND', message: 'Order not found' };
  }
  if (order.status === 'COMPLETED') {
    const wallet = await prisma.userWallet.findUnique({
      where: { userId: order.userId },
      select: { coinBalance: true },
    });
    return { ok: true, newBalance: wallet?.coinBalance ?? 0 };
  }
  if (order.status === 'FAILED' || order.status === 'REFUNDED') {
    return {
      ok: false,
      code: 'ORDER_FAILED',
      message: `Order is ${order.status}`,
    };
  }

  const creditResult = await credit(order.userId, order.coins, {
    type: 'PURCHASE',
    referenceId: order.id,
    description: `Coin purchase order ${order.id}`,
  });

  if (!creditResult.success) {
    return {
      ok: false,
      code: 'ORDER_FAILED',
      message: creditResult.reason ?? 'Wallet credit failed',
    };
  }

  await prisma.coinPurchaseOrder.update({
    where: { id: orderId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  return { ok: true, newBalance: creditResult.newBalance };
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
