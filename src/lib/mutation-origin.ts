/**
 * Origin allowlist for state-changing API requests (middleware + optional route checks).
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

/** True if Origin is absent or matches the configured app origin(s). */
export function isMutationOriginAllowed(req: Pick<Request, 'headers'>): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return allowedOrigins().has(origin);
}

/**
 * Returns a 403 JSON response when `Origin` is present and not an allowed app origin.
 * Returns null when the request should proceed.
 */
export function blockDisallowedMutationOrigin(req: Request): NextResponse | null {
  if (isMutationOriginAllowed(req)) return null;
  return NextResponse.json({ ok: false, message: 'Invalid origin', code: 'FORBIDDEN_ORIGIN' }, { status: 403 });
}
