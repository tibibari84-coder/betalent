/**
 * POST /api/watch-progress
 * Record watch time and completion % for For You retention scoring.
 * Body: { videoId, watchTimeSec, completedPct, durationSec }.
 * Requires auth.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordWatchProgress } from '@/services/watch-progress.service';
import { z } from 'zod';

const bodySchema = z.object({
  videoId: z.string().min(1, 'videoId required'),
  watchTimeSec: z.number().min(0),
  completedPct: z.number().min(0).max(1),
  durationSec: z.number().min(1),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    await recordWatchProgress({
      userId: user.id,
      videoId: parsed.videoId,
      watchTimeSec: parsed.watchTimeSec,
      completedPct: parsed.completedPct,
      durationSec: parsed.durationSec,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: e.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to record watch progress' }, { status: 500 });
  }
}
