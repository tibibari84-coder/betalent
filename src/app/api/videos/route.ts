import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET(req: Request) {
  try {
    const viewer = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 50);
    const cursor = searchParams.get('cursor');
    const categoryId = searchParams.get('categoryId');

    const base = categoryId
      ? { categoryId, ...CANONICAL_PUBLIC_VIDEO_WHERE }
      : { ...CANONICAL_PUBLIC_VIDEO_WHERE };
    const where = { AND: [base, videoDiscoveryVisibilityWhere(viewer?.id ?? null)] };

    const videos = await prisma.video.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            country: true,
            isVerified: true,
          },
        },
        category: { select: { name: true, slug: true } },
      },
    });

    const hasMore = videos.length > limit;
    const items = hasMore ? videos.slice(0, limit) : videos;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      ok: true,
      videos: items,
      nextCursor,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
