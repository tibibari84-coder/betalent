/**
 * Cron endpoint: cleanup stale media rows and storage objects.
 * Removes stale UPLOADING and stale FAILED videos with their storage objects.
 * Call with: GET or POST /api/cron/media-storage-cleanup (Vercel Cron uses GET + Bearer)
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 * CRON_SECRET must be set (fail closed if missing).
 */
import { NextResponse } from 'next/server';
import { runMediaStorageCleanup } from '@/services/media-storage-cleanup.service';
import { cronHandler } from '@/lib/cron-secret';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
/** Vercel route segment: max request duration (seconds). NOT video duration. */
export const maxDuration = 120;

async function execute(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') ?? '200', 10);
    const result = await runMediaStorageCleanup(Number.isFinite(limit) ? limit : 200);
    if (result.failures.length > 0) {
      console.error('[cron/media-storage-cleanup] failures', result.failures);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[cron/media-storage-cleanup]', e);
    return apiError(500, e instanceof Error ? e.message : 'Media cleanup failed', { code: 'MEDIA_CLEANUP_FAILED' });
  }
}

const handle = cronHandler(execute);
export const GET = handle;
export const POST = handle;
