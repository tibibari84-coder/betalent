import { prisma } from '@/lib/prisma';
import { getPublicAppBaseUrlForServerLinks } from '@/lib/public-app-url';
import { getStripeServerClient, isStripeServerClientAvailable } from '@/lib/stripe-client';
import type { CreatePurchaseIntentFn, PurchaseIntentResult } from '@/types/payment';

export function isStripeConfigured(): boolean {
  return isStripeServerClientAvailable();
}

function isProductionBilling(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Stripe Checkout for coin purchases. Amounts and line items are resolved server-side only.
 * Live mode requires a fixed Stripe Price ID on the package; test mode may use price_data from DB amounts.
 */
export const createStripeCheckoutSession: CreatePurchaseIntentFn = async (params) => {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return {
      orderId: params.orderId,
      status: 'FAILED',
      message: isProductionBilling() ? 'Checkout unavailable' : 'Stripe not configured',
    };
  }

  const priceId = params.stripePriceId?.trim() ?? null;
  if (isProductionBilling()) {
    if (!priceId) {
      return {
        orderId: params.orderId,
        status: 'FAILED',
        message: 'Checkout unavailable',
      };
    }
  }

  const origin = getPublicAppBaseUrlForServerLinks();

  try {
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 as const }]
      : [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              unit_amount: params.amountCents,
              product_data: {
                name: `${params.coins} BETALENT Coins`,
                description: `Coin package: ${params.packageInternalName}`,
              },
            },
            quantity: 1 as const,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
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
  } catch {
    console.error('[stripe-provider] checkout.session.create failed');
    return {
      orderId: params.orderId,
      status: 'FAILED',
      message: isProductionBilling() ? 'Checkout unavailable' : 'Payment failed',
    };
  }
};
