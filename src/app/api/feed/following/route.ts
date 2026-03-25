import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { interleaveFollowingFeedVideos } from '@/services/fair-discovery.service';
import { mapVideoRowToFeedItem, type FeedVideoApiItem } from '@/lib/feed-api-response';

export type FollowingFeedItem = FeedVideoApiItem;

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', message: 'Login required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '30', 10),
      50
    );
    const cursor = searchParams.get('cursor') ?? null;

    const follows = await prisma.follow.findMany({
      where: { followerId: currentUser.id },
      select: { creatorId: true },
    });
    const creatorIds = follows.map((f) => f.creatorId);
    if (creatorIds.length === 0) {
      return NextResponse.json({ ok: true, videos: [] });
    }

    const cursorWhere =
      cursor
        ? await prisma.video
            .findUnique({ where: { id: cursor }, select: { createdAt: true } })
            .then((v) => (v ? { createdAt: { lt: v.createdAt } } : undefined))
        : undefined;

    const rawVideos = await prisma.video.findMany({
      where: {
        creatorId: { in: creatorIds },
        creator: {
          OR: [{ profileVisibility: { not: 'PRIVATE' } }, { id: currentUser.id }],
        },
        ...CANONICAL_PUBLIC_VIDEO_WHERE,
        videoUrl: { not: null },
        ...(cursorWhere ?? {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit * 8, 200),
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            country: true,
            isVerified: true,
            creatorVerification: {
              where: { verificationStatus: 'APPROVED' },
              select: { verificationLevel: true },
            },
          },
        },
      },
    });

    const videos = interleaveFollowingFeedVideos(rawVideos, limit);

    const items = videos.map((v) => mapVideoRowToFeedItem(v));

    return NextResponse.json({ ok: true, videos: items });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
