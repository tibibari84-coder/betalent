/**
 * POST /api/videos/[id]/watch-stat
 * Record watch event for For You retention. Updates VideoWatchStats (aggregated) and UserWatchInteraction (per-user).
 * Body: { watchedSeconds, watchedPercent, completed, skippedQuickly, replayed }
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_WATCH_STAT_PER_VIDEO_PER_MIN } from '@/constants/api-rate-limits';
import { recordWatchStat } from '@/services/watch-stat.service';
import { z } from 'zod';

const bodySchema = z.object({
  watchedSeconds: z.number().min(0),
  watchedPercent: z.number().min(0).max(1),
  completed: z.boolean(),
  skippedQuickly: z.boolean(),
  replayed: z.boolean(),
  isFinal: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    if (!videoId) {
      return NextResponse.json({ ok: false, message: 'Video ID required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const userId = user?.id ?? null;
    const clientIp = getClientIp(req);
    const actorId = userId ? `user:${userId}` : `ip:${clientIp}`;
    // Limit per actor+video to protect ranking signals from watch-stat spam.
    if (
      !(await checkRateLimit(
        'watch-stat-video',
        `${actorId}:${videoId}`,
        RATE_LIMIT_WATCH_STAT_PER_VIDEO_PER_MIN,
        60 * 1000
      ))
    ) {
      return NextResponse.json({ ok: false, message: 'Too many watch updates' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    await recordWatchStat({
      videoId,
      userId,
      watchedSeconds: parsed.watchedSeconds,
      watchedPercent: parsed.watchedPercent,
      completed: parsed.completed,
      skippedQuickly: parsed.skippedQuickly,
      replayed: parsed.replayed,
      isFinal: parsed.isFinal ?? true,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: e.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Failed to record watch stat' }, { status: 500 });
  }
}
