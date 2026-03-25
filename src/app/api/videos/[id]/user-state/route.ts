import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { getVideoUserState } from '@/services/video.service';
import { getCurrentUser } from '@/lib/auth';

/** GET /api/videos/[id]/user-state — returns { liked, following, userVote } for the current user. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const [video, currentUser] = await Promise.all([
      prisma.video.findFirst({
        where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
        select: { creatorId: true },
      }),
      getCurrentUser(),
    ]);
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    const userState = await getVideoUserState(
      videoId,
      video.creatorId,
      currentUser?.id ?? null
    );
    return NextResponse.json({ ok: true, ...userState });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
