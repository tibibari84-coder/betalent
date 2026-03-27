/**
 * Like API – persistent like system.
 * POST /api/like – add like (one per user per video).
 * DELETE /api/like – remove like.
 * Returns: { ok, liked, likesCount }.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

async function getVideoLikesCount(videoId: string): Promise<number> {
  const v = await prisma.video.findUnique({
    where: { id: videoId },
    select: { likesCount: true },
  });
  return v?.likesCount ?? 0;
}

/** POST /api/like – add like. Body: { videoId }. */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = (await req.json()) as { videoId?: string };
    const videoId = body?.videoId?.trim();
    if (!videoId) {
      return NextResponse.json({ ok: false, message: 'videoId required' }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
      select: { id: true },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_videoId: { userId: user.id, videoId } },
    });
    if (existing) {
      const likesCount = await getVideoLikesCount(videoId);
      return NextResponse.json({ ok: true, liked: true, likesCount });
    }

    try {
      await prisma.$transaction([
        prisma.like.create({ data: { userId: user.id, videoId } }),
        prisma.video.update({
          where: { id: videoId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const likesCount = await getVideoLikesCount(videoId);
        return NextResponse.json({ ok: true, liked: true, likesCount });
      }
      throw e;
    }
    const likesCount = await getVideoLikesCount(videoId);
    return NextResponse.json({ ok: true, liked: true, likesCount });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** DELETE /api/like – remove like. Body: { videoId }. */
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    let body: { videoId?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const videoId = (body?.videoId ?? (req.url && new URL(req.url).searchParams.get('videoId')))?.trim();
    if (!videoId) {
      return NextResponse.json({ ok: false, message: 'videoId required' }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, ...CANONICAL_PUBLIC_VIDEO_WHERE },
      select: { id: true },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_videoId: { userId: user.id, videoId } },
    });
    if (!existing) {
      const likesCount = await getVideoLikesCount(videoId);
      return NextResponse.json({ ok: true, liked: false, likesCount });
    }

    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.video.update({
        where: { id: videoId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
    const likesCount = await getVideoLikesCount(videoId);
    return NextResponse.json({ ok: true, liked: false, likesCount });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
