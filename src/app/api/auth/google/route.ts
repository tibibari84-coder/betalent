import { NextResponse } from 'next/server';
import { sealData } from 'iron-session';

export const dynamic = 'force-dynamic';
import { randomBytes } from 'crypto';
import { getSessionPassword, getSessionTtlSeconds } from '@/lib/session-options';
import { getGoogleRedirectUriForRequest } from '@/lib/google-oauth';
import { assertGoogleOAuthConfigured } from '@/lib/runtime-config';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET(request: Request) {
  try {
    assertGoogleOAuthConfigured();
  } catch {
    const url = new URL(request.url);
    const referer = request.headers.get('referer') ?? '';
    const path =
      referer.includes('/register') ? '/register' : referer.includes('/login') ? '/login' : '/login';
    return NextResponse.redirect(new URL(`${path}?error=google_not_configured`, url.origin));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();

  const redirectUri = getGoogleRedirectUriForRequest(request);

  const state = await sealData(
    { n: randomBytes(24).toString('hex'), t: Date.now(), ru: redirectUri },
    { password: getSessionPassword(), ttl: 600 }
  );
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH}?${params.toString()}`);
}
