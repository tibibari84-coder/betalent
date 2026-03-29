/**
 * Admin: Force boost or disable video in For You feed.
 * POST /api/admin/feed/video-override
 *
 * Body: { videoId: string, action: 'boost' | 'disable' | 'reset', boostMultiplier?: number }
 * - boost: set rankingBoostMultiplier (e.g. 1.5 = 50% boost). Requires boostMultiplier.
 * - disable: set rankingDisabled = true (exclude from all public discovery/listing surfaces).
 * - reset: clear rankingBoostMultiplier and set rankingDisabled = false (re-allow public discovery/listing).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adminVideoOverrideSchema } from '@/lib/api-schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    if (msg === 'Unauthorized') return NextResponse.json({ ok: false, message: msg }, { status: 401 });
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = adminVideoOverrideSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { videoId, action, boostMultiplier } = parsed.data;

    if (action === 'boost' && boostMultiplier == null) {
      return NextResponse.json({ ok: false, message: 'boost requires boostMultiplier' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const update: { rankingBoostMultiplier?: number | null; rankingDisabled?: boolean } = {};
    if (action === 'boost') {
      update.rankingBoostMultiplier = boostMultiplier;
      update.rankingDisabled = false;
    } else if (action === 'disable') {
      update.rankingBoostMultiplier = null;
      update.rankingDisabled = true;
    } else {
      update.rankingBoostMultiplier = null;
      update.rankingDisabled = false;
    }

    await prisma.video.update({
      where: { id: videoId },
      data: update,
    });

    return NextResponse.json({
      ok: true,
      videoId,
      action,
      rankingBoostMultiplier: update.rankingBoostMultiplier ?? null,
      rankingDisabled: update.rankingDisabled ?? false,
    });
  } catch (e) {
    console.error('[admin/feed/video-override]', e);
    return NextResponse.json({ ok: false, message: 'Request failed' }, { status: 500 });
  }
}
