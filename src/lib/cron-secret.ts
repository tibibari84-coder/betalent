import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';

/**
 * Enforces cron authentication for all `/api/cron/*` routes.
 *
 * Fail closed:
 * - If `CRON_SECRET` is missing or empty → 500 (misconfiguration), no job runs.
 * - If secret is set but header does not match → 401.
 *
 * Accepts: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
 * Vercel Cron sends **GET** with `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in project env.
 */
export function assertCronAuthorized(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    console.error('[cron] CRON_SECRET is not set; rejecting request (fail closed)');
    return apiError(500, 'Server misconfigured: CRON_SECRET is not set', { code: 'CRON_NOT_CONFIGURED' });
  }

  const auth = request.headers.get('authorization');
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? '';
  const provided = bearer || headerSecret;

  if (!provided || provided !== expected) {
    return apiError(401, 'Unauthorized', { code: 'CRON_UNAUTHORIZED' });
  }

  return null;
}

/**
 * Wraps a cron job so **GET** (Vercel) and **POST** (manual / curl) both run the same handler after auth.
 */
export function cronHandler(run: (request: Request) => Promise<NextResponse>): (request: Request) => Promise<NextResponse> {
  return async function handleCron(request: Request): Promise<NextResponse> {
    const denied = assertCronAuthorized(request);
    if (denied) return denied;
    if (request.method !== 'GET' && request.method !== 'POST') {
      return NextResponse.json(
        { ok: false, message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
        { status: 405, headers: { Allow: 'GET, POST' } }
      );
    }
    return run(request);
  };
}
