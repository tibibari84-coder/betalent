/**
 * Scheduled operational scan (Vercel Cron): counts likely-stuck upload/processing rows.
 * Configure: vercel.json crons + CRON_SECRET; send Authorization: Bearer <CRON_SECRET>.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { logOpsEvent } from '@/lib/ops-events';

const UPLOAD_STALE_MS = 2 * 60 * 60 * 1000;
const PROCESS_STALE_MS = 3 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, code: 'CRON_SECRET_NOT_SET' }, { status: 503 });
  }
  const auth = req.headers.get('authorization')?.trim();
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const now = Date.now();
  const uploadCutoff = new Date(now - UPLOAD_STALE_MS);
  const processCutoff = new Date(now - PROCESS_STALE_MS);

  try {
    const [uploadingStale, processingStale] = await Promise.all([
      prisma.video.count({
        where: {
          uploadStatus: 'UPLOADING',
          updatedAt: { lt: uploadCutoff },
        },
      }),
      prisma.video.count({
        where: {
          status: 'PROCESSING',
          processingStatus: { in: ['PENDING_PROCESSING', 'ANALYZING_AUDIO'] },
          updatedAt: { lt: processCutoff },
        },
      }),
    ]);

    logger.info('ops_stale_upload_scan', {
      uploadingStale,
      processingStale,
      uploadStaleHours: UPLOAD_STALE_MS / 3600000,
      processStaleHours: PROCESS_STALE_MS / 3600000,
    });
    logOpsEvent('api_stale_upload_scan', { uploadingStale, processingStale });

    return NextResponse.json({
      ok: true,
      uploadingStale,
      processingStale,
    });
  } catch (e) {
    logger.error('ops_stale_upload_scan_failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, code: 'SCAN_FAILED' }, { status: 500 });
  }
}
