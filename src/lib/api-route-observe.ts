/**
 * Load-test / observability helpers for API routes.
 * Enable JSON timing logs with OBSERVE_API_TIMING=1 (stdout; aggregate in your log stack / APM).
 *
 * Correlation: middleware sets x-request-id on /api/*; this stamps the same id on JSON responses.
 */

import { NextResponse } from 'next/server';

export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id')?.trim() || crypto.randomUUID();
}

/** Session- or viewer-dependent responses — must not be cached by shared caches. */
export type CachePolicy = 'personalized' | 'none';

const CACHE_HEADERS: Record<CachePolicy, Record<string, string>> = {
  personalized: {
    'Cache-Control': 'private, no-store, must-revalidate',
    Vary: 'Cookie',
  },
  none: {},
};

/**
 * Attach x-request-id, optional cache policy, optional timing log (OBSERVE_API_TIMING=1).
 */
export function stampApiResponse(
  res: NextResponse,
  req: Request,
  options: {
    routeKey: string;
    cachePolicy: CachePolicy;
    startedAt: number;
  }
): NextResponse {
  const rid = getRequestId(req);
  res.headers.set('x-request-id', rid);
  for (const [k, v] of Object.entries(CACHE_HEADERS[options.cachePolicy])) {
    res.headers.set(k, v);
  }
  const ms = Math.round(performance.now() - options.startedAt);
  if (process.env.OBSERVE_API_TIMING === '1') {
    console.log(
      JSON.stringify({
        type: 'api_timing',
        route: options.routeKey,
        requestId: rid,
        status: res.status,
        ms,
      })
    );
  }
  return res;
}
