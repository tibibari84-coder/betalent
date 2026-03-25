import { assertGoogleOAuthConfigured } from '@/lib/runtime-config';

const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

function getProductionOAuthBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (!configured) {
    throw new Error('GOOGLE_OAUTH_APP_URL_MISSING');
  }
  // Accept either:
  // - https://betalent-ooe6.vercel.app
  // - betalent-ooe6.vercel.app
  // - http://betalent-ooe6.vercel.app (normalized to https)
  if (configured.startsWith('http://')) {
    return `https://${configured.slice('http://'.length)}`;
  }
  if (configured.startsWith('https://')) {
    return configured;
  }
  if (configured.startsWith('http')) {
    throw new Error('GOOGLE_OAUTH_APP_URL_UNSUPPORTED_SCHEME');
  }
  return `https://${configured}`;
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
 * Production: canonical public URL from env (correct behind proxies).
 * Development: public origin from Host / forwarded headers (Cloudflare tunnel, LAN hostname).
 */
export function getGoogleRedirectUriForRequest(request: Request): string {
  if (process.env.NODE_ENV === 'production') {
    return `${getProductionOAuthBaseUrl()}${GOOGLE_CALLBACK_PATH}`;
  }
  return `${getDevPublicOrigin(request)}${GOOGLE_CALLBACK_PATH}`;
}

/** Same origin as the incoming callback request (dev + prod). */
export function appOriginForOAuthRedirect(request: Request): string {
  if (process.env.NODE_ENV === 'production') {
    return getProductionOAuthBaseUrl();
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
