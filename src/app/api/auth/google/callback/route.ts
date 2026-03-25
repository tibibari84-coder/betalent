import { NextResponse } from 'next/server';
import { unsealData } from 'iron-session';

export const dynamic = 'force-dynamic';
import { getSessionPassword } from '@/lib/session-options';
import {
  appOriginForOAuthRedirect,
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
  getGoogleRedirectUriForRequest,
} from '@/lib/google-oauth';
import { resolveGoogleUser } from '@/services/google-auth.service';
import { getSession } from '@/lib/session';
import { logAuthEvent } from '@/services/auth-audit.service';
import { getClientIp } from '@/lib/rate-limit';

function redirectWithError(request: Request, code: string) {
  const u = new URL('/login', appOriginForOAuthRedirect(request));
  u.searchParams.set('error', code);
  return NextResponse.redirect(u);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent');

  if (oauthErr) {
    return redirectWithError(request, `google_${oauthErr}`);
  }
  if (!code || !state) {
    return redirectWithError(request, 'google_bad_request');
  }

  let sealed: { n: string; t: number; ru?: string };
  try {
    sealed = await unsealData(state, { password: getSessionPassword(), ttl: 600 });
  } catch {
    return redirectWithError(request, 'google_state');
  }
  if (Date.now() - sealed.t > 10 * 60 * 1000) {
    return redirectWithError(request, 'google_state_expired');
  }

  const redirectUri = sealed.ru ?? getGoogleRedirectUriForRequest(request);

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code, redirectUri);
    const info = await fetchGoogleUserInfo(tokens.access_token);
    const profile = {
      sub: info.sub,
      email: info.email,
      emailVerified: !!info.email_verified,
      name: info.name,
      picture: info.picture,
    };

    const { user, linked } = await resolveGoogleUser(profile);

    const session = await getSession();
    session.pending2FAUserId = undefined;
    session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified: !!user.emailVerifiedAt,
      ...(user.preferredLocale != null && { locale: user.preferredLocale }),
    };
    await session.save();

    await logAuthEvent(linked ? 'GOOGLE_LINKED' : 'GOOGLE_SIGNIN', {
      userId: user.id,
      ip,
      userAgent: ua,
      meta: { linked },
    });

    const nextPath = user.emailVerifiedAt ? '/feed' : '/verify-email';
    return NextResponse.redirect(new URL(nextPath, appOriginForOAuthRedirect(request)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'GOOGLE_EMAIL_UNVERIFIED') {
      return redirectWithError(request, 'google_email_unverified');
    }
    if (msg === 'GOOGLE_ACCOUNT_CONFLICT') {
      return redirectWithError(request, 'google_account_conflict');
    }
    if (msg === 'GOOGLE_NOT_CONFIGURED' || msg === 'GOOGLE_TOKEN_EXCHANGE_FAILED') {
      return redirectWithError(request, 'google_not_configured');
    }
    console.error('[google/callback]', e);
    return redirectWithError(request, 'google_failed');
  }
}
