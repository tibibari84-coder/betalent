import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

/**
 * Loads the Checkout Session from Stripe and confirms it matches our pending/completed order
 * (metadata, amount, currency). Does not trust webhook payload alone — uses the Stripe API.
 */
export async function verifyPaidCheckoutSessionMatchesOrder(
  stripe: Stripe,
  checkoutSessionId: string
): Promise<{ orderId: string }> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.mode !== 'payment') {
    throw new Error('CHECKOUT_MODE_INVALID');
  }
  if (session.payment_status !== 'paid') {
    throw new Error('CHECKOUT_NOT_PAID');
  }
  if (session.status !== 'complete') {
    throw new Error('CHECKOUT_NOT_COMPLETE');
  }

  const amountTotal = session.amount_total;
  if (amountTotal == null) {
    throw new Error('CHECKOUT_AMOUNT_MISSING');
  }

  const currency = (session.currency ?? '').toUpperCase();

  const order = await prisma.coinPurchaseOrder.findFirst({
    where: { provider: 'STRIPE', providerReferenceId: checkoutSessionId },
    select: {
      id: true,
      userId: true,
      amountCents: true,
      currency: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const mdOrder = session.metadata?.orderId?.trim() ?? '';
  const mdUser = session.metadata?.userId?.trim() ?? '';
  if (mdOrder !== order.id || mdUser !== order.userId) {
    throw new Error('CHECKOUT_METADATA_MISMATCH');
  }

  if (amountTotal !== order.amountCents) {
    throw new Error('CHECKOUT_AMOUNT_MISMATCH');
  }

  if (currency !== order.currency.toUpperCase()) {
    throw new Error('CHECKOUT_CURRENCY_MISMATCH');
  }

  if (order.status === 'FAILED' || order.status === 'REFUNDED') {
    throw new Error('ORDER_NOT_PAYABLE');
  }

  return { orderId: order.id };
}
