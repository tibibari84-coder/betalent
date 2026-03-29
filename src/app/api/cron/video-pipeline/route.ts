/**
 * Vercel Cron: async video processing + stale upload cleanup.
 * Authorization: x-vercel-cron or Authorization: Bearer CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runVideoProcessingWorker } from '@/server/workers/videoProcessingWorker';
import { runStaleUploadCleanupWorker } from '@/server/workers/staleUploadCleanupWorker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
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
    const processing = await runVideoProcessingWorker(15);
    const stale = await runStaleUploadCleanupWorker(50);
    logger.info('video_pipeline_cron', { processing, stale });
    return NextResponse.json({ ok: true, processing, stale });
  } catch (e) {
    logger.error('video_pipeline_cron_failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, code: 'VIDEO_PIPELINE_CRON_FAILED' }, { status: 500 });
  }
}
