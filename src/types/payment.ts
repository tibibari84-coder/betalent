/**
 * Payment provider abstraction for coin purchases.
 * Wallet logic is separate: wallet is credited only when a purchase order is fulfilled
 * (after provider confirms payment, e.g. via webhook).
 */

export type PurchaseIntentResult = {
  /** Our order id (already created) */
  orderId: string;
  status: 'PENDING' | 'REQUIRES_ACTION' | 'FAILED';
  /** For Stripe: client secret for PaymentElement / confirmPayment */
  clientSecret?: string | null;
  /** For redirect flows (e.g. PayPal) */
  redirectUrl?: string | null;
  /** Human message (e.g. "Payment integration coming soon") */
  message?: string | null;
};

export type PaymentProviderId = 'MOCK' | 'STRIPE' | 'PAYPAL';

/**
 * Provider-specific creation of a payment intent.
 * Called after we have created a CoinPurchaseOrder (PENDING).
 * Provider may set providerReferenceId on the order and return clientSecret/redirectUrl.
 * Wallet is NOT credited here; that happens in fulfillOrder when provider confirms.
 */
export type CreatePurchaseIntentFn = (params: {
  orderId: string;
  userId: string;
  amountCents: number;
  currency: string;
  coins: number;
  packageInternalName: string;
  /** Stripe Price id (price_...). Required for live Checkout; optional in test (server price_data). */
  stripePriceId: string | null;
}) => Promise<PurchaseIntentResult>;
