import Stripe from 'stripe';

function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Server-only Stripe SDK. Enforces test vs live key alignment with `NODE_ENV`:
 * - `production`: only `sk_live_` + publishable must be `pk_live_` (never test keys).
 * - non-production: only `sk_test_` + `pk_test_` (never live keys in dev).
 *
 * Secrets are never logged. Returns null if misconfigured.
 */
export function getStripeServerClient(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!secret || !publishable) return null;

  if (isProductionNodeEnv()) {
    if (!secret.startsWith('sk_live_')) return null;
    if (!publishable.startsWith('pk_live_')) return null;
  } else {
    if (!secret.startsWith('sk_test_')) return null;
    if (!publishable.startsWith('pk_test_')) return null;
  }

  return new Stripe(secret);
}

export function isStripeServerClientAvailable(): boolean {
  return getStripeServerClient() !== null;
}
