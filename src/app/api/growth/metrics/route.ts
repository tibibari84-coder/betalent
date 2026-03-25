/**
 * GET /api/growth/metrics
 * Growth metrics for viral loop: shares per video, referrals, signup conversion.
 * Requires auth (admin or creator dashboard).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [shareStats, referralStats, videoShareCounts] = await Promise.all([
      prisma.shareEvent.groupBy({
        by: ['resourceType'],
        _count: { id: true },
      }),
      prisma.referral.groupBy({
        by: ['referrerId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      }),
      prisma.video.findMany({
        where: { ...CANONICAL_PUBLIC_VIDEO_WHERE, sharesCount: { gt: 0 } },
        orderBy: { sharesCount: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          sharesCount: true,
          sharesLast24h: true,
          viewsCount: true,
          creatorId: true,
          creator: { select: { username: true, displayName: true } },
        },
      }),
    ]);

    const sharesByType = Object.fromEntries(
      shareStats.map((s) => [s.resourceType, s._count.id])
    );

    const topReferrers = referralStats.map((r) => ({
      referrerId: r.referrerId,
      referredCount: r._count.id,
    }));

    const topSharedVideos = videoShareCounts.map((v) => ({
      videoId: v.id,
      title: v.title,
      sharesCount: v.sharesCount,
      sharesLast24h: v.sharesLast24h,
      viewsCount: v.viewsCount,
      shareRate: v.viewsCount > 0 ? v.sharesCount / v.viewsCount : 0,
      creator: v.creator,
    }));

    return NextResponse.json({
      ok: true,
      metrics: {
        totalSharesByType: sharesByType,
        topReferrers,
        topSharedVideos,
      },
    });
  } catch (e) {
    console.error('[growth/metrics]', e);
    return NextResponse.json(
      { ok: false, message: 'Failed to fetch growth metrics' },
      { status: 500 }
    );
  }
}
