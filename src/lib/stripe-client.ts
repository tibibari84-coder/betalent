import Stripe from 'stripe';

/**
 * Single source of truth for Stripe SDK construction.
 *
 * **Current product phase:** test mode only (`sk_test_` / `pk_test_`). Live keys are
 * intentionally not wired — enable only after the separate real-money milestone.
 * Checkout + webhook must use this helper so they stay in sync.
 */
const STRIPE_TEST_SECRET_PREFIX = 'sk_test_';

export function getStripeTestClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !key.startsWith(STRIPE_TEST_SECRET_PREFIX)) return null;
  return new Stripe(key);
}

export function isStripeTestClientAvailable(): boolean {
  return getStripeTestClient() !== null;
}
