import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

/** GET — issue CSRF cookie + return token (for clients that prefer JSON over reading the cookie). */
export async function GET() {
  const token = randomBytes(32).toString('base64url');
  const isProd = process.env.NODE_ENV === 'production';
  const res = NextResponse.json({ ok: true, csrfToken: token });
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
  });
  return res;
}
