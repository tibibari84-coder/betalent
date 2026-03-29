/**
 * POST /api/share
 * Track a share event (copy_link or external). Optional auth; increments Video.sharesCount when resource is VIDEO.
 * Rate-limited per user. Stores referrerId (sharer) for growth metrics.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_SHARES_PER_USER_PER_HOUR } from '@/constants/anti-cheat';
import { z } from 'zod';

const bodySchema = z.object({
  shareType: z.enum(['copy_link', 'external']),
  resourceType: z.enum(['video', 'profile']),
  resourceId: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
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
    const { shareType, resourceType, resourceId } = parsed.data;

    const shareTypeDb = shareType === 'copy_link' ? 'COPY_LINK' : 'EXTERNAL';
    const resourceTypeDb = resourceType === 'video' ? 'VIDEO' : 'PROFILE';

    const rateLimitId = user?.id ?? getClientIp(req);
    if (!(await checkRateLimit('share', rateLimitId, RATE_LIMIT_SHARES_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json(
        { ok: false, message: 'Too many shares. Try again later.' },
        { status: 429 }
      );
    }

    if (resourceTypeDb === 'VIDEO') {
      const video = await prisma.video.findFirst({
        where: { id: resourceId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
        select: { id: true },
      });
      if (!video) {
        return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
      }
    }

    const referrerId = user?.id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.shareEvent.create({
        data: {
          userId: referrerId,
          shareType: shareTypeDb,
          resourceType: resourceTypeDb,
          resourceId,
          referrerId,
        },
      });
      if (resourceTypeDb === 'VIDEO') {
        await tx.video.update({
          where: { id: resourceId },
          data: { sharesCount: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: 'Share track failed' }, { status: 500 });
  }
}
