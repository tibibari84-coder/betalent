/**
 * API response stamping + optional structured latency logs (BT_OPS_LOG=1 or OBSERVE_API_TIMING=1).
 *
 * Correlation: middleware sets x-request-id on /api/*; this stamps the same id on JSON responses.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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
  const latencyMs = Math.round(performance.now() - options.startedAt);
  const structuredApi =
    process.env.BT_OPS_LOG === '1' || process.env.OBSERVE_API_TIMING === '1';
  if (structuredApi) {
    logger.info('api_request', {
      route: options.routeKey,
      requestId: rid,
      status: res.status,
      latencyMs,
      result: res.status >= 500 ? 'error' : res.status >= 400 ? 'client_error' : 'ok',
    });
  }
  if (res.status >= 500) {
    logger.error('api_route_5xx', {
      route: options.routeKey,
      requestId: rid,
      status: res.status,
      latencyMs,
    });
  }
  return res;
}
