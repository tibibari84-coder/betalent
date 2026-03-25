import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/session-options';

export async function POST() {
  const session = await getSession();
  session.destroy();
  const res = NextResponse.json({ ok: true });
  // Ensure cookie is cleared (iron-session may not set Set-Cookie on destroy in some environments)
  res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
