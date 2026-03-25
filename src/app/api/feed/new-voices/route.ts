import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { filterVideoIdsForFeedViewer } from '@/lib/feed-profile-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { getNewVoicesFairVideoIds } from '@/services/new-voices-fair.service';
import { loadFeedVideosInOrder, type FeedVideoApiItem } from '@/lib/feed-api-response';

export type NewVoicesFeedItem = FeedVideoApiItem;

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '30', 10),
      50
    );
    const cursor = searchParams.get('cursor') ?? null;

    let videoIds = await getNewVoicesFairVideoIds({
      viewerUserId: sessionUser?.id ?? null,
      limit,
      cursorVideoId: cursor,
    });
    videoIds = await filterVideoIdsForFeedViewer(videoIds, sessionUser?.id ?? null);
    videoIds = videoIds.slice(0, limit);

    if (videoIds.length === 0) {
      return NextResponse.json(
        { ok: true, videos: [] },
        { headers: { 'Cache-Control': 'private, max-age=120' } }
      );
    }

    const items = await loadFeedVideosInOrder(videoIds);

    return NextResponse.json(
      { ok: true, videos: items },
      {
        headers: {
          'Cache-Control': 'private, max-age=120',
        },
      }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
