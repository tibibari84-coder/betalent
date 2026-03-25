/**
 * Cron endpoint: recalculate Video.sharesLast24h from ShareEvent.
 * Use for viral velocity boost in ranking. Run hourly.
 * Call with: GET or POST /api/cron/shares-velocity (Vercel Cron uses GET + Bearer)
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * CRON_SECRET must be set (fail closed if missing).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { cronHandler } from '@/lib/cron-secret';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
/** Vercel route segment: max request duration (seconds). NOT video duration. */
export const maxDuration = 60;

const WINDOW_MS = 24 * 60 * 60 * 1000;

async function execute(_request: Request) {
  try {
    const since = new Date(Date.now() - WINDOW_MS);

    await prisma.video.updateMany({
      where: CANONICAL_PUBLIC_VIDEO_WHERE,
      data: { sharesLast24h: 0 },
    });

    const counts = await prisma.shareEvent.groupBy({
      by: ['resourceId'],
      where: {
        resourceType: 'VIDEO',
        createdAt: { gte: since },
      },
      _count: { id: true },
    });

    let updated = 0;
    for (const row of counts) {
      await prisma.video.updateMany({
        where: { id: row.resourceId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
        data: { sharesLast24h: row._count.id },
      });
      updated++;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    console.error('[cron/shares-velocity]', e);
    return apiError(500, e instanceof Error ? e.message : 'Shares velocity update failed', { code: 'SHARES_VELOCITY_FAILED' });
  }
}

const handle = cronHandler(execute);
export const GET = handle;
export const POST = handle;
