import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getVideoById } from '@/services/video.service';
import { getVideoGiftSummary } from '@/services/video-gift-summary.service';
import { prisma } from '@/lib/prisma';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { logger } from '@/lib/logger';
import { stampApiResponse } from '@/lib/api-route-observe';
import { isVocalPerformanceStyleSlug } from '@/constants/vocal-style-catalog';

const VIDEO_GET_ROUTE = 'GET /api/videos/[id]';

const patchVideoSchema = z
  .object({
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    commentPermission: z.enum(['EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF']).optional(),
    /** Draft metadata while uploadStatus is UPLOADING (before POST /api/upload/complete). */
    title: z.string().min(1).max(150).optional(),
    description: z.string().max(500).optional().nullable(),
    categorySlug: z.string().min(1).max(120).optional(),
    contentType: z.enum(['ORIGINAL', 'COVER', 'REMIX']).optional(),
    coverOriginalArtistName: z.string().max(200).optional().nullable(),
    coverSongTitle: z.string().max(200).optional().nullable(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'No changes provided',
  });

const EMPTY_GIFT_SUMMARY = {
  totalCoinsReceived: 0,
  totalGiftsReceived: 0,
  giftCountByType: [] as Array<{ giftId: string; giftSlug: string; giftName: string; coinCost: number; count: number }>,
  topSupporters: [] as Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    totalCoinsSent: number;
    giftsCount: number;
  }>,
};

const EMPTY_SUPPORT_STATS = {
  totalSuperVotes: 0,
  totalCoinsEarned: 0,
  forYouGiftCoinsTotal: 0,
  recentGiftVelocity: 0,
};

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const startedAt = performance.now();
  try {
    const { id } = params;
    const sessionUser = await getCurrentUser();
    const [video, giftSummary, supportStats] = await Promise.all([
      getVideoById(id, sessionUser?.id ?? null),
      getVideoGiftSummary(id),
      prisma.videoSupportStats.findUnique({ where: { videoId: id } }),
    ]);
    if (!video) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 }),
        req,
        { routeKey: VIDEO_GET_ROUTE, cachePolicy: 'personalized', startedAt }
      );
    }
    const supportStatsPayload = supportStats
      ? {
          totalSuperVotes: supportStats.totalSuperVotes,
          totalCoinsEarned: supportStats.totalCoinsEarned,
          forYouGiftCoinsTotal: supportStats.forYouGiftCoinsTotal ?? 0,
          recentGiftVelocity: supportStats.recentGiftVelocity ?? 0,
        }
      : EMPTY_SUPPORT_STATS;
    const creatorVerificationLevel = (video.creator as { creatorVerification?: { verificationLevel: string } | null })
      ?.creatorVerification?.verificationLevel ?? null;
    const { profileVisibility: _pv, ...creatorRest } = video.creator as typeof video.creator & { profileVisibility?: unknown };
    const serializedCreator = {
      ...creatorRest,
      verificationLevel: creatorVerificationLevel,
    };
    delete (serializedCreator as { creatorVerification?: unknown }).creatorVerification;
    const serializedComments = (video.comments ?? []).map((c) => {
      const u = c.user as { creatorVerification?: { verificationLevel: string } | null };
      const commentUserLevel = u?.creatorVerification?.verificationLevel ?? null;
      const serializedUser = {
        ...c.user,
        verified: !!(c.user as { isVerified?: boolean }).isVerified,
        verificationLevel: commentUserLevel,
      };
      delete (serializedUser as { creatorVerification?: unknown }).creatorVerification;
      return { ...c, user: serializedUser };
    });
    return stampApiResponse(
      NextResponse.json({
        ok: true,
        video: {
          ...video,
          creator: serializedCreator,
          comments: serializedComments,
          giftSummary: giftSummary ?? EMPTY_GIFT_SUMMARY,
          supportStats: supportStatsPayload,
        },
      }),
      req,
      { routeKey: VIDEO_GET_ROUTE, cachePolicy: 'personalized', startedAt }
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: VIDEO_GET_ROUTE, cachePolicy: 'personalized', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Failed to fetch video' }, { status: 500 }),
      req,
      { routeKey: VIDEO_GET_ROUTE, cachePolicy: 'personalized', startedAt }
    );
  }
}

/**
 * PATCH — owner (or admin): visibility / comment rules anytime; title/category/cover while upload still UPLOADING.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const { id } = params;
    if (!id?.trim()) {
      return NextResponse.json({ ok: false, message: 'Invalid video id' }, { status: 400 });
    }
    const body = await req.json();
    const parsed = patchVideoSchema.parse(body);

    const row = await prisma.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true, uploadStatus: true, contentType: true, deletedAt: true },
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    if (row.deletedAt) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && row.creatorId !== user.id) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }

    const hasDraftPatch =
      parsed.title !== undefined ||
      parsed.description !== undefined ||
      parsed.categorySlug !== undefined ||
      parsed.contentType !== undefined ||
      parsed.coverOriginalArtistName !== undefined ||
      parsed.coverSongTitle !== undefined;

    if (hasDraftPatch && row.uploadStatus !== 'UPLOADING') {
      return NextResponse.json(
        { ok: false, message: 'Performance details can only be edited while the upload is still finishing.' },
        { status: 400 }
      );
    }

    const data: Parameters<typeof prisma.video.update>[0]['data'] = {
      ...(parsed.visibility ? { visibility: parsed.visibility } : {}),
      ...(parsed.commentPermission ? { commentPermission: parsed.commentPermission } : {}),
    };

    if (parsed.title !== undefined) {
      data.title = parsed.title;
    }
    if (parsed.description !== undefined) {
      data.description = parsed.description;
    }

    if (parsed.categorySlug !== undefined) {
      const category = await prisma.category.findUnique({
        where: { slug: parsed.categorySlug },
        select: { id: true, slug: true },
      });
      if (!category) {
        return NextResponse.json({ ok: false, message: 'Invalid style' }, { status: 400 });
      }
      data.categoryId = category.id;
      data.performanceStyle = isVocalPerformanceStyleSlug(category.slug) ? category.slug : null;
    }

    if (parsed.contentType !== undefined) {
      data.contentType = parsed.contentType;
      data.contentLicensingEligible = parsed.contentType === 'ORIGINAL';
      if (parsed.contentType !== 'COVER') {
        data.coverOriginalArtistName = null;
        data.coverSongTitle = null;
      }
    }

    const effectiveContentType = parsed.contentType ?? row.contentType;
    if (effectiveContentType === 'COVER') {
      if (parsed.coverOriginalArtistName !== undefined) {
        data.coverOriginalArtistName = parsed.coverOriginalArtistName?.trim() || null;
      }
      if (parsed.coverSongTitle !== undefined) {
        data.coverSongTitle = parsed.coverSongTitle?.trim() || null;
      }
    }

    await prisma.video.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      ok: true,
      ...(parsed.visibility ? { visibility: parsed.visibility } : {}),
      ...(parsed.commentPermission ? { commentPermission: parsed.commentPermission } : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Invalid input', errors: e.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to update video' }, { status: 500 });
  }
}

/**
 * DELETE — soft delete only (deletedAt). R2 + hard DB row removal runs in {@link runVideoCleanupWorker}.
 * Strict owner check: creatorId must match session user (no admin bypass).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;
    if (!id?.trim()) {
      return NextResponse.json({ ok: false, message: 'Invalid video id' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true, deletedAt: true },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    if (video.creatorId !== user.id) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }
    if (video.deletedAt) {
      logger.info('VIDEO_SOFT_DELETE_IDEMPOTENT', { videoId: id, userId: user.id });
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      const owner = await tx.user.findUnique({
        where: { id: video.creatorId },
        select: { videosCount: true },
      });
      if (owner && owner.videosCount > 0) {
        await tx.user.update({
          where: { id: video.creatorId },
          data: { videosCount: { decrement: 1 } },
        });
      }
    });

    logger.info('VIDEO_SOFT_DELETED', { videoId: id, userId: user.id });
    return NextResponse.json({ ok: true, softDeleted: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    logger.error('VIDEO_SOFT_DELETE_FAILED', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, message: 'Failed to delete video' }, { status: 500 });
  }
}
