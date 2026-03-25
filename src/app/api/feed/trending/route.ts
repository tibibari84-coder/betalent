import { NextResponse } from 'next/server';
import { getTrendingVideos } from '@/services/trending.service';
import type { TrendWindowKey } from '@/services/trending.service';
import { getCurrentUser } from '@/lib/auth';
import { filterVideoIdsForFeedViewer } from '@/lib/feed-profile-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { loadFeedVideosInOrder, type FeedVideoApiItem } from '@/lib/feed-api-response';

export type TrendingFeedItem = FeedVideoApiItem;

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const windowParam = searchParams.get('window') as TrendWindowKey | null;
    const validWindows: TrendWindowKey[] = ['3h', '6h', '12h', '24h'];
    const window =
      windowParam && validWindows.includes(windowParam)
        ? windowParam
        : '24h';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '30', 10),
      50
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    const requestLimit = offset + limit;
    let { videoIds, windowHours } = await getTrendingVideos({ window, limit: requestLimit });
    videoIds = videoIds.slice(offset, offset + limit);
    videoIds = await filterVideoIdsForFeedViewer(videoIds, sessionUser?.id ?? null);

    if (videoIds.length === 0) {
      return NextResponse.json(
        { ok: true, videos: [], window, windowHours },
        { headers: { 'Cache-Control': 'private, max-age=120' } }
      );
    }

    const items = await loadFeedVideosInOrder(videoIds);

    return NextResponse.json(
      {
        ok: true,
        videos: items,
        window,
        windowHours,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=120',
        },
      }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
