import { Prisma } from '@prisma/client';
import { assertProductionAuthEncryptionKey } from '@/lib/auth-encryption-key';
import { getSessionPassword } from '@/lib/session-options';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Fail fast on production boot when auth/session/database cannot run safely.
 * Does not validate optional integrations (e.g. OAuth, Stripe, S3).
 */
export function assertProductionRuntimeConfig(): void {
  if (!isProduction()) return;
  assertProductionAuthEncryptionKey();
  getSessionPassword();
  const db = process.env.DATABASE_URL?.trim();
  if (!db) {
    throw new Error('[Deploy] DATABASE_URL is required in production.');
  }
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

export function getStripeRuntimeReadiness(): {
  ready: boolean;
  mode: 'test' | 'unavailable';
  reasons: string[];
} {
  const reasons: string[] = [];
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  // TEST-ONLY activation: do not enable live billing from runtime readiness.
  const keyLooksValid = key.startsWith('sk_test_');
  const publishableLooksValid = publishable.startsWith('pk_test_');
  if (!keyLooksValid) reasons.push('STRIPE_SECRET_KEY_INVALID_OR_MISSING');
  if (!publishableLooksValid) reasons.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_INVALID_OR_MISSING');
  if (!webhook.startsWith('whsec_')) reasons.push('STRIPE_WEBHOOK_SECRET_INVALID_OR_MISSING');
  return { ready: reasons.length === 0, mode: reasons.length === 0 ? 'test' : 'unavailable', reasons };
}

export function isSchemaDriftError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === 'P2021' || error.code === 'P2022';
}
