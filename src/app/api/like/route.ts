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
import { logOpsAbuse, logOpsEvent } from '@/lib/ops-events';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMIT_VIDEO_LIKE_PER_USER_PER_HOUR } from '@/constants/api-rate-limits';
import { z } from 'zod';

const likeBodySchema = z.object({ videoId: z.string().cuid() });

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
    if (!(await checkRateLimit('video-like-user', user.id, RATE_LIMIT_VIDEO_LIKE_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json(
        { ok: false, message: 'Too many like actions. Please try again later.', code: 'RATE_LIMIT_LIKE' },
        { status: 429 }
      );
    }
    const parsed = likeBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid videoId' }, { status: 400 });
    }
    const { videoId } = parsed.data;

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
        logOpsAbuse('like_duplicate_race', { userId: user.id, videoId });
        logOpsEvent('like_duplicate_collision', { userId: user.id, videoId });
        const likesCount = await getVideoLikesCount(videoId);
        return NextResponse.json({ ok: true, liked: true, likesCount });
      }
      throw e;
    }
    const likesCount = await getVideoLikesCount(videoId);
    logOpsEvent('like_success', { userId: user.id, videoId, action: 'add' });
    return NextResponse.json({ ok: true, liked: true, likesCount });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: 'Like failed', code: 'LIKE_FAILED' }, { status: 500 });
  }
}

/** DELETE /api/like – remove like. Body: { videoId }. */
export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    if (!(await checkRateLimit('video-like-user', user.id, RATE_LIMIT_VIDEO_LIKE_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return NextResponse.json(
        { ok: false, message: 'Too many like actions. Please try again later.', code: 'RATE_LIMIT_LIKE' },
        { status: 429 }
      );
    }
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      raw = {};
    }
    const fromQuery = req.url ? new URL(req.url).searchParams.get('videoId') : null;
    const parsed = likeBodySchema.safeParse(
      typeof raw === 'object' && raw !== null && 'videoId' in raw && (raw as { videoId?: string }).videoId
        ? raw
        : fromQuery
          ? { videoId: fromQuery }
          : {}
    );
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid videoId' }, { status: 400 });
    }
    const { videoId } = parsed.data;

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
    logOpsEvent('like_success', { userId: user.id, videoId, action: 'remove' });
    return NextResponse.json({ ok: true, liked: false, likesCount });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: 'Unlike failed', code: 'UNLIKE_FAILED' }, { status: 500 });
  }
}
