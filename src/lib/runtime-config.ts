import { Prisma } from '@prisma/client';
import { assertProductionAuthEncryptionKey } from '@/lib/auth-encryption-key';
import { getSessionPassword } from '@/lib/session-options';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Fail fast on production boot when auth/session/database cannot run safely.
 * When Stripe env vars are partially set, or fully set with wrong key mode, fails in production.
 */
export function assertProductionRuntimeConfig(): void {
  if (!isProduction()) return;
  assertProductionAuthEncryptionKey();
  getSessionPassword();
  const db = process.env.DATABASE_URL?.trim();
  if (!db) {
    throw new Error('[Deploy] DATABASE_URL is required in production.');
  }
  assertProductionStripeEnvConsistency();
}

export function assertGoogleOAuthConfigured(): void {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
  }
}

/** Same as boot-time 2FA crypto check (uses @/lib/auth-encryption-key — no Node `crypto` import here). */
export function assertTwoFactorCryptoConfigured(): void {
  assertProductionAuthEncryptionKey();
}

/**
 * Production Stripe env sanity: log-only so the app (e.g. /feed) keeps running if payouts are not ready.
 * Coin purchase + webhook routes enforce readiness separately; never crash the whole deployment for partial Stripe setup.
 */
export function assertProductionStripeEnvConsistency(): void {
  if (!isProduction()) return;
  const sk = process.env.STRIPE_SECRET_KEY?.trim();
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const wh = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const any = !!(sk || pk || wh);
  const all = !!(sk && pk && wh);
  if (any && !all) {
    console.error(
      '[Deploy] Stripe env incomplete: set all of STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, or remove all three. Purchases stay disabled until fixed.'
    );
    return;
  }
  if (!all) return;
  if (!sk!.startsWith('sk_live_')) {
    console.error(
      '[Deploy] STRIPE_SECRET_KEY must use sk_live_... in production when all three Stripe vars are set. Purchases disabled until corrected.'
    );
    return;
  }
  if (!pk!.startsWith('pk_live_')) {
    console.error(
      '[Deploy] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must use pk_live_... in production when Stripe is fully configured.'
    );
    return;
  }
  if (!wh!.startsWith('whsec_')) {
    console.error('[Deploy] STRIPE_WEBHOOK_SECRET must be whsec_... when Stripe is fully configured.');
  }
}

export function getStripeRuntimeReadiness(): {
  ready: boolean;
  mode: 'live' | 'test' | 'unavailable';
  reasons: string[];
} {
  const reasons: string[] = [];
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  if (isProduction()) {
    if (!key.startsWith('sk_live_')) reasons.push('STRIPE_SECRET_KEY_INVALID_OR_MISSING');
    if (!publishable.startsWith('pk_live_')) reasons.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_INVALID_OR_MISSING');
  } else {
    if (!key.startsWith('sk_test_')) reasons.push('STRIPE_SECRET_KEY_INVALID_OR_MISSING');
    if (!publishable.startsWith('pk_test_')) reasons.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_INVALID_OR_MISSING');
  }
  if (!webhook.startsWith('whsec_')) reasons.push('STRIPE_WEBHOOK_SECRET_INVALID_OR_MISSING');
  const mode: 'live' | 'test' | 'unavailable' =
    reasons.length === 0 ? (isProduction() ? 'live' : 'test') : 'unavailable';
  return { ready: reasons.length === 0, mode, reasons };
}

export function isSchemaDriftError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === 'P2021' || error.code === 'P2022';
}
