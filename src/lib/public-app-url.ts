/**
 * Canonical public site URL for production (emails, Stripe redirects, OAuth).
 * Never use silent localhost fallbacks when NODE_ENV=production.
 */

function normalizeConfiguredBase(trimmed: string): string {
  if (!trimmed) {
    throw new Error('NEXT_PUBLIC_APP_URL_REQUIRED');
  }
  if (trimmed.startsWith('http://')) {
    const rest = trimmed.slice('http://'.length);
    const host = rest.split('/')[0]?.split(':')[0] ?? '';
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      throw new Error('NEXT_PUBLIC_APP_URL_LOCALHOST_IN_PRODUCTION');
    }
    return `https://${rest}`;
  }
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('http')) {
    throw new Error('NEXT_PUBLIC_APP_URL_UNSUPPORTED_SCHEME');
  }
  return `https://${trimmed}`;
}

/** Required in production: NEXT_PUBLIC_APP_URL (https, non-loopback). */
export function getProductionPublicAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? '';
  return normalizeConfiguredBase(configured);
}

/**
 * Server-side absolute URL base for emails, payment redirects, and similar.
 * Production: strict {@link getProductionPublicAppBaseUrl}.
 * Development: NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost.
 */
export function getPublicAppBaseUrlForServerLinks(): string {
  if (process.env.NODE_ENV === 'production') {
    return getProductionPublicAppBaseUrl();
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) {
    if (configured.startsWith('http://') || configured.startsWith('https://')) {
      return configured;
    }
    return `https://${configured}`;
  }
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, '');
  if (vercel) {
    return vercel.startsWith('http') ? vercel : `https://${vercel}`;
  }
  return 'http://localhost:3000';
}
