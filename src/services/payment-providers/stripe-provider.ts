import { prisma } from '@/lib/prisma';
import type { CreatePurchaseIntentFn, PurchaseIntentResult } from '@/types/payment';
import { getStripeTestClient, isStripeTestClientAvailable } from '@/lib/stripe-client';

/** True when test-mode Stripe secret is present (see {@link getStripeTestClient}). */
export function isStripeConfigured(): boolean {
  return isStripeTestClientAvailable();
}

/**
 * Stripe Checkout Session provider for coin purchases (TEST mode only until live-money milestone).
 * Creates Checkout Session, stores session.id on order, returns redirectUrl.
 * Webhook must use the same {@link getStripeTestClient} construction.
 */
export const createStripeCheckoutSession: CreatePurchaseIntentFn = async (params) => {
  const stripe = getStripeTestClient();
  if (!stripe) {
    return {
      orderId: params.orderId,
      status: 'FAILED',
      message: 'Stripe not configured',
    };
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountCents,
            product_data: {
              name: `${params.coins} BETALENT Coins`,
              description: `Coin package: ${params.packageInternalName}`,
              images: undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/wallet?redirect_status=succeeded&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wallet?redirect_status=cancelled`,
      metadata: {
        orderId: params.orderId,
        userId: params.userId,
        coins: String(params.coins),
        package: params.packageInternalName,
      },
    });

    await prisma.coinPurchaseOrder.update({
      where: { id: params.orderId },
      data: {
        provider: 'STRIPE',
        providerReferenceId: session.id,
      },
    });

    const result: PurchaseIntentResult = {
      orderId: params.orderId,
      status: 'PENDING',
      redirectUrl: session.url ?? null,
    };
    return result;
  } catch (e) {
    console.error('[stripe-provider] Checkout Session create', e);
    return {
      orderId: params.orderId,
      status: 'FAILED',
      message: e instanceof Error ? e.message : 'Payment failed',
    };
  }
};
