/**
 * Optional client-side error reports (backup when Sentry is disabled). Rate-limited; no raw PII.
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logOpsEvent } from '@/lib/ops-events';

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT_PER_IP = 40;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit('ops-client-error', ip, LIMIT_PER_IP, WINDOW_MS))) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMIT' }, { status: 429 });
  }

  let body: { message?: string; stack?: string; url?: string; digest?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 500) : '';
  if (!message) {
    return NextResponse.json({ ok: false, code: 'MESSAGE_REQUIRED' }, { status: 400 });
  }

  const stack = typeof body.stack === 'string' ? body.stack.slice(0, 2000) : undefined;
  const url = typeof body.url === 'string' ? body.url.slice(0, 500) : undefined;
  const digest = typeof body.digest === 'string' ? body.digest.slice(0, 128) : undefined;

  logger.error('client_runtime_error_report', {
    message,
    stackPreview: stack?.slice(0, 200),
    url,
    digest,
  });
  logOpsEvent('client_runtime_error', { message: message.slice(0, 120), url, digest });

  return NextResponse.json({ ok: true });
}
