/**
 * Vercel Cron (or external scheduler): soft-deleted video storage cleanup + hard DB delete.
 * Authorization: Authorization: Bearer <CRON_SECRET> (same as ops-stale-uploads).
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runVideoCleanupWorker } from '@/server/workers/videoCleanupWorker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  /** Vercel Cron invokes with this header (no Bearer). Manual runs: `Authorization: Bearer $CRON_SECRET`. */
  const vercelCron = req.headers.get('x-vercel-cron') === '1';
  const auth = req.headers.get('authorization')?.trim();
  const bearerOk = Boolean(secret && auth === `Bearer ${secret}`);
  if (!vercelCron && !bearerOk) {
    if (!secret) {
      return NextResponse.json({ ok: false, code: 'CRON_SECRET_NOT_SET' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const result = await runVideoCleanupWorker(25);
    logger.info('video_cleanup_cron', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error('video_cleanup_cron_failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, code: 'CLEANUP_FAILED' }, { status: 500 });
  }
}
