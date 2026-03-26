import { getProductionPublicAppBaseUrl } from '@/lib/public-app-url';
import { assertGoogleOAuthConfigured } from '@/lib/runtime-config';

const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

function getProductionOAuthBaseUrl(): string {
  try {
    return getProductionPublicAppBaseUrl();
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'NEXT_PUBLIC_APP_URL_REQUIRED') {
      throw new Error('GOOGLE_OAUTH_APP_URL_MISSING');
    }
    if (msg === 'NEXT_PUBLIC_APP_URL_LOCALHOST_IN_PRODUCTION') {
      throw new Error('GOOGLE_OAUTH_APP_URL_LOCALHOST');
    }
    if (msg === 'NEXT_PUBLIC_APP_URL_UNSUPPORTED_SCHEME') {
      throw new Error('GOOGLE_OAUTH_APP_URL_UNSUPPORTED_SCHEME');
    }
    throw new Error('GOOGLE_OAUTH_APP_URL_MISSING');
  }
}

/** Host part only, lowercased (no port for standard HTTPS). */
function hostnameFromRequest(request: Request): string | null {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = request.headers.get('host')?.split(',')[0]?.trim();
  const raw = forwardedHost || hostHeader || new URL(request.url).host;
  if (!raw) return null;
  return raw.split(':')[0].replace(/^\[|\]$/g, '').toLowerCase();
}

/**
 * Trusted public origin from the incoming request (production only).
 * Fixes Google `redirect_uri_mismatch` when the browser uses a different hostname than
 * `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` (e.g. new Vercel project URL or preview domain).
 * Host must be allowlisted — not arbitrary Host headers.
 */
function getTrustedProductionRequestOrigin(request: Request): string | null {
  const hostname = hostnameFromRequest(request);
  if (!hostname || hostname === 'localhost' || hostname.startsWith('127.') || hostname === '::1') {
    return null;
  }

  const vercelHost =
    process.env.VERCEL_URL?.replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0]?.toLowerCase() ?? '';
  const isVercelApp = hostname.endsWith('.vercel.app');
  const matchesDeployment = vercelHost !== '' && hostname === vercelHost;

  const extraAllow =
    process.env.GOOGLE_OAUTH_ALLOWED_HOSTS?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const allowedExtra = extraAllow.includes(hostname);

  let configuredHost: string | null = null;
  const np = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (np) {
    try {
      const u = new URL(np.startsWith('http') ? np : `https://${np}`);
      configuredHost = u.hostname.toLowerCase();
    } catch {
      /* ignore */
    }
  }
  const matchesConfigured = configuredHost !== null && hostname === configuredHost;

  if (!isVercelApp && !matchesDeployment && !allowedExtra && !matchesConfigured) {
    return null;
  }

  const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = xfProto === 'http' || xfProto === 'https' ? xfProto : 'https';
  return `${proto}://${hostname}`;
}

/**
 * Production OAuth base URL: prefer trusted request origin so redirect_uri matches the URL in the address bar.
 * Falls back to env-based URL when the Host header is not trusted.
 */
function getProductionOAuthOrigin(request: Request): string {
  const trusted = getTrustedProductionRequestOrigin(request);
  if (trusted) return trusted;
  return getProductionOAuthBaseUrl();
}

/**
 * Dev + Cloudflare quick tunnel: `request.url` is often `http://localhost:3000/...` while the browser
 * used `https://*.trycloudflare.com`. Google then sees redirect_uri=localhost → Console mismatch.
 * Prefer `x-forwarded-host` / `Host` when they are not loopback.
 */
function getDevPublicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = request.headers.get('host')?.split(',')[0]?.trim();
  const host = forwardedHost || hostHeader || url.host;
  const hostname = host.split(':')[0].replace(/^\[|\]$/g, '');
  const isLoopback =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  if (isLoopback) {
    return url.origin;
  }

  const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto =
    xfProto ||
    (host.includes('trycloudflare.com') ? 'https' : url.protocol.replace(':', '') || 'http');

  return `${proto}://${host}`;
}

/**
 * Production: redirect_uri matches trusted Host (Vercel / configured domain) or env fallback.
 * Development: public origin from Host / forwarded headers (Cloudflare tunnel, LAN hostname).
 */
export function getGoogleRedirectUriForRequest(request: Request): string {
  if (process.env.NODE_ENV === 'production') {
    return `${getProductionOAuthOrigin(request)}${GOOGLE_CALLBACK_PATH}`;
  }
  return `${getDevPublicOrigin(request)}${GOOGLE_CALLBACK_PATH}`;
}

/** Same origin as the incoming OAuth request (dev + prod) — used for post-login redirects. */
export function appOriginForOAuthRedirect(request: Request): string {
  if (process.env.NODE_ENV === 'production') {
    return getProductionOAuthOrigin(request);
  }
  return getDevPublicOrigin(request);
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  id_token?: string;
}> {
  try {
    assertGoogleOAuthConfigured();
  } catch {
    throw new Error('GOOGLE_NOT_CONFIGURED');
  }
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('[google-oauth] token exchange failed', res.status, t);
    throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED');
  }
  const data = (await res.json()) as Record<string, unknown>;
  const access_token = typeof data.access_token === 'string' ? data.access_token : '';
  if (!access_token) {
    console.error('[google-oauth] token response missing access_token', data);
    throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED');
  }
  const id_token = typeof data.id_token === 'string' ? data.id_token : undefined;
  return { access_token, id_token };
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('GOOGLE_USERINFO_FAILED');
  }
  return res.json();
}
