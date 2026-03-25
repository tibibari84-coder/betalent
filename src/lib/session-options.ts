import type { SessionOptions } from 'iron-session';

export const SESSION_COOKIE_NAME = 'betalent_session';

const FALLBACK_SECRET = 'betalent-session-secret-change-in-production';
const MIN_SECRET_LENGTH = 32;

/** Session TTL in seconds (must match unseal in middleware). */
export function getSessionTtlSeconds(): number {
  return 60 * 60 * 24 * 7; // 7 days
}

/**
 * SESSION_SECRET — production: required, min 32 chars, no fallback.
 * Used by iron-session and middleware unseal.
 */
export function getSessionPassword(): string {
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!SESSION_SECRET || SESSION_SECRET.trim() === '') {
      throw new Error(
        '[Security] SESSION_SECRET is required in production. Set a secure random string of at least 32 characters.'
      );
    }
    if (SESSION_SECRET === FALLBACK_SECRET) {
      throw new Error('[Security] SESSION_SECRET cannot use the default fallback in production.');
    }
    if (SESSION_SECRET.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `[Security] SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production.`
      );
    }
    return SESSION_SECRET;
  }

  return SESSION_SECRET ?? FALLBACK_SECRET;
}

export function getIronSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: SESSION_COOKIE_NAME,
    ttl: getSessionTtlSeconds(),
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: getSessionTtlSeconds(),
      path: '/',
    },
  };
}
