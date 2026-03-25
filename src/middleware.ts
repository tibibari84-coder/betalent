import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import type { SessionData } from '@/lib/session';
import {
  SESSION_COOKIE_NAME,
  getSessionPassword,
  getSessionTtlSeconds,
} from '@/lib/session-options';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/feed',
  '/following',
  '/upload',
  '/settings',
  '/notifications',
  '/my-videos',
  '/wallet',
  '/creator',
  '/moderation',
  '/admin',
];
const REF_COOKIE_NAME = 'betalent_ref';
const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** Owner hub only — public creator pages live at /profile/[username] (same rules as GET /api/profile/[username]). */
function isProfileMePath(pathname: string): boolean {
  return pathname === '/profile/me' || pathname.startsWith('/profile/me/');
}

function isProtected(pathname: string): boolean {
  if (isProfileMePath(pathname)) return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isVerifyEmailPath(pathname: string): boolean {
  return pathname === '/verify-email' || pathname.startsWith('/verify-email/');
}

function isLogin2FaPath(pathname: string): boolean {
  return pathname === '/login/2fa' || pathname.startsWith('/login/2fa/');
}

/** Auth entry / verification — never force verify-email redirect; protected routes handle that separately. */
function isAuthEntryPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/welcome' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/verify-email')
  );
}

function setRefCookie(res: NextResponse, ref: string) {
  res.cookies.set(REF_COOKIE_NAME, ref, {
    path: '/',
    maxAge: REF_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

async function readSession(request: NextRequest): Promise<SessionData | null> {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return await unsealData<SessionData>(raw, {
      password: getSessionPassword(),
      ttl: getSessionTtlSeconds(),
    });
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const validRef = ref && /^[a-z0-9]{20,30}$/i.test(ref);
  const pathname = request.nextUrl.pathname;

  /** Correlation id for all API routes (load tests, tracing). */
  if (pathname.startsWith('/api/')) {
    const incoming = request.headers.get('x-request-id')?.trim();
    const rid =
      incoming && incoming.length >= 8 ? incoming : crypto.randomUUID();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', rid);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('x-request-id', rid);
    if (validRef) setRefCookie(res, ref!);
    return res;
  }

  if (isAuthEntryPath(pathname)) {
    if (pathname === '/' || pathname === '/welcome' || pathname === '/login' || pathname === '/register') {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
      if (sessionCookie?.value) {
        const session = await readSession(request);
        if (session?.user?.emailVerified) {
          return NextResponse.redirect(new URL('/feed', request.url));
        }
      }
    }
    const res = NextResponse.next();
    if (validRef) setRefCookie(res, ref!);
    return res;
  }

  if (isProtected(pathname)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const redirect = NextResponse.redirect(loginUrl);
      if (validRef) setRefCookie(redirect, ref!);
      return redirect;
    }

    const session = await readSession(request);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      const redirect = NextResponse.redirect(loginUrl);
      if (validRef) setRefCookie(redirect, ref!);
      return redirect;
    }

    if (session.pending2FAUserId && !session.user) {
      if (!isLogin2FaPath(pathname)) {
        const u = new URL('/login/2fa', request.url);
        u.searchParams.set('from', pathname);
        return NextResponse.redirect(u);
      }
    } else if (session.user && !session.user.emailVerified) {
      if (!isVerifyEmailPath(pathname)) {
        const u = new URL('/verify-email', request.url);
        u.searchParams.set('from', pathname);
        u.searchParams.set('required', '1');
        return NextResponse.redirect(u);
      }
    }
  }

  const res = NextResponse.next();
  if (validRef) setRefCookie(res, ref!);
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/',
    '/welcome',
    '/dashboard/:path*',
    '/feed',
    '/following',
    '/feed/:path*',
    '/following/:path*',
    '/upload/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/notifications/:path*',
    '/my-videos/:path*',
    '/wallet/:path*',
    '/creator/:path*',
    '/moderation',
    '/admin',
    '/moderation/:path*',
    '/admin/:path*',
    '/video/:path*',
    '/v/:path*',
    '/register',
    '/login',
    '/login/2fa',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
  ],
};
