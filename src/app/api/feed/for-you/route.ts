import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getForYouFeedV2 } from '@/services/for-you/feed-v2.service';
import { filterVideoIdsForFeedViewer } from '@/lib/feed-profile-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';
import { loadFeedVideosInOrder, type FeedVideoApiItem } from '@/lib/feed-api-response';

const ROUTE_KEY = 'GET /api/feed/for-you';

/** @deprecated Use FeedVideoApiItem — kept for external type imports */
export type ForYouFeedItem = FeedVideoApiItem;

export async function GET(req: Request) {
  const startedAt = performance.now();
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '30', 10),
      50
    );
    const sessionCreatorIds = searchParams.get('creatorIds')?.split(',').filter(Boolean) ?? [];
    const excludeIds = searchParams.get('excludeIds')?.split(',').filter(Boolean) ?? [];
    const debug = searchParams.get('debug') === '1' && process.env.NODE_ENV !== 'production';
    const sessionUser = await getCurrentUser();

    const requestLimit = excludeIds.length > 0 ? Math.min(limit + excludeIds.length, 80) : limit;

    const result = await getForYouFeedV2({
      userId: sessionUser?.id ?? undefined,
      sessionCreatorIds,
      limit: requestLimit,
      debug,
    });
    let { videoIds } = result;
    const excludeSet = new Set(excludeIds);
    if (excludeSet.size > 0) {
      videoIds = videoIds.filter((id) => !excludeSet.has(id)).slice(0, limit);
    }
    videoIds = await filterVideoIdsForFeedViewer(videoIds, sessionUser?.id ?? null);

    if (videoIds.length === 0) {
      return stampApiResponse(NextResponse.json({ ok: true, videos: [] }), req, {
        routeKey: ROUTE_KEY,
        cachePolicy: 'personalized',
        startedAt,
      });
    }

    const items = await loadFeedVideosInOrder(videoIds);

    const res: {
      ok: boolean;
      videos: FeedVideoApiItem[];
      debug?: {
        scored: Array<{ id: string; scoreBreakdown?: unknown; explanation?: unknown }>;
        diagnostics?: unknown;
      };
    } = {
      ok: true,
      videos: items,
    };
    if (debug && result.debug) {
      res.debug = {
        scored: (result.debug.scored ?? []).map((s) => ({
          id: s.id,
          scoreBreakdown: s.scoreBreakdown,
          explanation: s.explanation,
        })),
        diagnostics: result.debug.diagnostics,
      };
    }
    return stampApiResponse(NextResponse.json(res), req, {
      routeKey: ROUTE_KEY,
      cachePolicy: 'personalized',
      startedAt,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'For You feed unavailable' }, { status: 500 }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  }
}
