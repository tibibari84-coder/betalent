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
  resourceId: z.string().min(1, 'resourceId required'),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { shareType, resourceType, resourceId } = bodySchema.parse(body);

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
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: 'Invalid body (shareType, resourceType, resourceId)', errors: e.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: false, message: 'Share track failed' }, { status: 500 });
  }
}
