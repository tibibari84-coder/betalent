import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getVideoById } from '@/services/video.service';
import { getVideoGiftSummary } from '@/services/video-gift-summary.service';
import { prisma } from '@/lib/prisma';
import { deleteVideoStorageObjects } from '@/services/storage-lifecycle.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';

const VIDEO_GET_ROUTE = 'GET /api/videos/[id]';

const patchVideoSchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  commentPermission: z.enum(['EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF']).optional(),
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
 * PATCH — owner (or admin): update visibility. Session-only auth; never trust client-only checks.
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
    if (!parsed.visibility && !parsed.commentPermission) {
      return NextResponse.json({ ok: false, message: 'No changes provided' }, { status: 400 });
    }

    const row = await prisma.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }
    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && row.creatorId !== user.id) {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }

    await prisma.video.update({
      where: { id },
      data: {
        ...(parsed.visibility ? { visibility: parsed.visibility } : {}),
        ...(parsed.commentPermission ? { commentPermission: parsed.commentPermission } : {}),
      },
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
 * DELETE — server-side only. Identity comes from the session cookie (getCurrentUser), never from
 * request body or client headers for authorization. Storage/network cleanup runs only after
 * authentication + ownership/admin checks succeed (two-phase read: authorize, then load payload).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Phase A — authenticated session (iron-session / cookie; not UI-dependent)
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }

    const { id } = params;
    if (!id?.trim()) {
      return NextResponse.json({ ok: false, message: 'Invalid video id' }, { status: 400 });
    }

    // Phase B — authorize using minimal row (no storage URLs/keys loaded yet)
    const authRow = await prisma.video.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });
    if (!authRow) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const isAdmin = sessionUser.role === 'ADMIN';
    const isOwner = authRow.creatorId === sessionUser.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { ok: false, message: 'You do not have permission to delete this video' },
        { status: 403 }
      );
    }

    // Phase C — only after authorization: load deletion payload and touch storage / DB
    const video = await prisma.video.findUnique({
      where: { id: authRow.id },
      select: {
        id: true,
        creatorId: true,
        storageKey: true,
        videoUrl: true,
        thumbnailUrl: true,
        mimeType: true,
      },
    });
    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const storageDelete = await deleteVideoStorageObjects(video);
    if (storageDelete.failed.length > 0) {
      console.error('[video.delete] storage delete failed', {
        videoId: id,
        failed: storageDelete.failed,
      });
      return NextResponse.json(
        {
          ok: false,
          message: 'Failed to delete one or more storage objects',
          failed: storageDelete.failed,
        },
        { status: 502 }
      );
    }

    try {
      await prisma.video.delete({ where: { id } });
      return NextResponse.json({
        ok: true,
        deletedStorageKeys: storageDelete.deleted,
        neutralizedStorageKeys: storageDelete.neutralized,
      });
    } catch (dbError) {
      console.error('[video.delete] db delete failed after storage cleanup', {
        videoId: id,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      await prisma.video.updateMany({
        where: { id },
        data: {
          status: 'HIDDEN',
          moderationStatus: 'BLOCKED',
          videoUrl: null,
          thumbnailUrl: null,
          storageKey: null,
          isFlagged: true,
        },
      });
      await prisma.mediaIntegrityAnalysis.upsert({
        where: { videoId: id },
        create: {
          videoId: id,
          moderationStatus: 'BLOCKED',
          flagReason: 'STORAGE_DB_DELETE_COMPENSATION',
          reviewedAt: new Date(),
        },
        update: {
          moderationStatus: 'BLOCKED',
          flagReason: 'STORAGE_DB_DELETE_COMPENSATION',
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(
        {
          ok: false,
          message: 'Storage removed but DB delete failed; row was quarantined',
          deletedStorageKeys: storageDelete.deleted,
          neutralizedStorageKeys: storageDelete.neutralized,
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ ok: false, message: 'Failed to delete video' }, { status: 500 });
  }
}
