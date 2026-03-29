/**
 * Optional Origin check for browser-initiated state-changing API requests.
 * Complements httpOnly + SameSite session cookies; blocks simple cross-site POST abuse when Origin is sent.
 * Non-browser clients often omit Origin — those requests are allowed.
 */

import { NextResponse } from 'next/server';
import { getPublicAppBaseUrlForServerLinks } from '@/lib/public-app-url';

function allowedOrigins(): Set<string> {
  const out = new Set<string>();
  try {
    out.add(new URL(getPublicAppBaseUrlForServerLinks()).origin);
  } catch {
    /* misconfigured env — do not block */
  }
  if (process.env.NODE_ENV !== 'production') {
    out.add('http://localhost:3000');
    out.add('http://127.0.0.1:3000');
    out.add('http://[::1]:3000');
  }
  return out;
}

/**
 * Returns a 403 JSON response when `Origin` is present and not an allowed app origin.
 * Returns null when the request should proceed.
 */
export function blockDisallowedMutationOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  if (allowedOrigins().has(origin)) return null;
  return NextResponse.json({ ok: false, message: 'Invalid origin', code: 'FORBIDDEN_ORIGIN' }, { status: 403 });
}
