/**
 * POST /api/watch-progress
 * Record watch time and completion % for For You retention scoring.
 * Body: { videoId, watchTimeSec, completedPct, durationSec }.
 * Requires auth.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordWatchProgress } from '@/services/watch-progress.service';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMIT_WATCH_PROGRESS_PER_USER_PER_MINUTE } from '@/constants/api-rate-limits';
import { z } from 'zod';

const bodySchema = z.object({
  videoId: z.string().min(1).max(128),
  watchTimeSec: z.number().finite().min(0).max(86400),
  completedPct: z.number().finite().min(0).max(1),
  durationSec: z.number().finite().min(1).max(86400),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (
      !(await checkRateLimit(
        'watch-progress-user',
        user.id,
        RATE_LIMIT_WATCH_PROGRESS_PER_USER_PER_MINUTE,
        60_000
      ))
    ) {
      return NextResponse.json({ ok: false, message: 'Too many updates. Slow down.' }, { status: 429 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await recordWatchProgress({
      userId: user.id,
      videoId: parsed.data.videoId,
      watchTimeSec: parsed.data.watchTimeSec,
      completedPct: parsed.data.completedPct,
      durationSec: parsed.data.durationSec,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: 'Failed to record watch progress' }, { status: 500 });
  }
}
