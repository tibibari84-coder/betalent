import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getVideosByCreator } from '@/services/video.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

/** GET /api/videos/[id]/related-by-creator?creatorId=... — more performances from the same creator. */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const viewer = await getCurrentUser();
    const videoId = params.id;
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get('creatorId');
    if (!creatorId) {
      return NextResponse.json({ ok: false, message: 'creatorId required' }, { status: 400 });
    }
    const videos = await getVideosByCreator(creatorId, videoId, 6, viewer?.id ?? null);
    const serialized = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      commentsCount: v.commentsCount,
      creator: v.creator,
    }));
    return NextResponse.json({ ok: true, videos: serialized });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
