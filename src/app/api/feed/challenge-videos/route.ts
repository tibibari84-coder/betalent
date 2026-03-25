/**
 * GET /api/feed/challenge-videos
 * Vertical-feed shaped list of public videos linked to ACTIVE challenge entries (newest entries first).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { filterVideoIdsForFeedViewer } from '@/lib/feed-profile-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';
import { mapVideoRowToFeedItem } from '@/lib/feed-api-response';

const ROUTE_KEY = 'GET /api/feed/challenge-videos';

export async function GET(req: Request) {
  const startedAt = performance.now();
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 50);
    const cursor = searchParams.get('cursor')?.trim() || null;

    const sessionUser = await getCurrentUser();
    const viewerId = sessionUser?.id ?? null;

    const take = Math.min(limit + 20, 80);

    const entries = await prisma.challengeEntry.findMany({
      where: {
        status: 'ACTIVE',
        video: { is: CANONICAL_PUBLIC_VIDEO_WHERE },
      },
      orderBy: { joinedAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        challenge: { select: { title: true } },
        video: {
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
        },
      },
    });

    const videoIds = entries.map((e) => e.videoId);
    const allowedIds = await filterVideoIdsForFeedViewer(videoIds, viewerId);
    const allowed = new Set(allowedIds);

    const rows = entries.filter((e) => allowed.has(e.videoId));
    const sliced = rows.slice(0, limit);

    const items = sliced.map((e) =>
      mapVideoRowToFeedItem(e.video, e.challenge.title ?? undefined)
    );

    const hasMore = entries.length === take;
    const nextCursor = hasMore ? entries[entries.length - 1].id : null;

    return stampApiResponse(
      NextResponse.json({
        ok: true,
        videos: items,
        nextCursor,
      }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }
    console.error('[feed/challenge-videos]', e);
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Challenge feed unavailable' }, { status: 500 }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  }
}
