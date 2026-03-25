import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/session-options';

export async function POST() {
  const session = await getSession();
  session.destroy();
  const res = NextResponse.json({ ok: true, authenticated: false });
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
  return res;
}
