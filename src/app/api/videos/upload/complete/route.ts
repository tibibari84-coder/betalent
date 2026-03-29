/**
 * POST /api/videos/upload/complete
 *
 * Finalize direct upload: bind playback URL, mark UPLOADED + PROCESSING, reward, enqueue async pipeline.
 * Heavy processing runs in {@link runVideoProcessingWorker}, not here.
 */

import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildPublicPlaybackUrl, getPlaybackUrl, getStorageConfig, isValidVideoStorageKeyForUser } from '@/lib/storage';
import { rewardUpload } from '@/services/coin.service';
import { RATE_LIMIT_UPLOAD_COMPLETE_PER_HOUR } from '@/constants/api-rate-limits';
import { logOpsEvent } from '@/lib/ops-events';
import { logger } from '@/lib/logger';

const completeSchema = z.object({
  /** Prisma @default(cuid()) — allow full id string (avoid z.cuid() mismatch with cuid2). */
  videoId: z.string().min(1).max(128),
  /** Required — must match the object key from POST /api/upload/init (binds finalize to the presigned upload). */
  storageKey: z.string().min(1).max(512),
});

function logComplete(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>) {
  const payload = { msg, ...data, timestamp: new Date().toISOString() };
  if (level === 'error') console.error('[upload/complete]', payload);
  else if (level === 'warn') console.warn('[upload/complete]', payload);
  else console.log('[upload/complete]', payload);
}

/** Mandatory trace: full Video row fields for debugging upload/feed eligibility. */
async function logVideoDbRow(videoId: string, label: string): Promise<void> {
  const row = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      thumbnailUrl: true,
      storageKey: true,
      uploadStatus: true,
      status: true,
      processingStatus: true,
      moderationStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  logComplete('info', `DB row snapshot: ${label}`, {
    videoId,
    row: row
      ? {
          ...row,
          videoUrl:
            row.videoUrl && row.videoUrl.length > 160 ? `${row.videoUrl.slice(0, 160)}…` : row.videoUrl,
        }
      : null,
  });
}

export async function POST(req: Request) {
  try {
    const user = await requireVerifiedUser();
    if (
      !(await checkRateLimit(
        'upload-complete-user',
        user.id,
        RATE_LIMIT_UPLOAD_COMPLETE_PER_HOUR,
        60 * 60 * 1000
      ))
    ) {
      logOpsEvent('upload_failed', { userId: user.id, errorCode: 'RATE_LIMIT_UPLOAD_COMPLETE' });
      return NextResponse.json(
        {
          ok: false,
          message: 'Too many upload completion attempts. Please try again later.',
          step: 'upload',
          code: 'RATE_LIMIT_UPLOAD_COMPLETE',
        },
        { status: 429 }
      );
    }
    const body = await req.json();
    const { videoId, storageKey: storageKeyFromClient } = completeSchema.parse(body);
    if (!isValidVideoStorageKeyForUser(user.id, videoId, storageKeyFromClient)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid storage key', step: 'save', code: 'STORAGE_KEY_INVALID' },
        { status: 400 }
      );
    }
    const storageConfig = getStorageConfig();
    logComplete('info', 'complete called', {
      videoId,
      userId: user.id,
      requestBodyKeys: body && typeof body === 'object' ? Object.keys(body as object) : [],
      hasR2PublicUrlEnv: Boolean(process.env.R2_PUBLIC_URL?.trim()),
      storageConfigured: Boolean(storageConfig),
      storageBucket: storageConfig?.bucket ?? null,
    });

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true, uploadStatus: true, storageKey: true },
    });

    if (!video) {
      return NextResponse.json({ ok: false, message: 'Video not found', step: 'save' }, { status: 404 });
    }
    if (video.creatorId !== user.id) {
      return NextResponse.json({ ok: false, message: 'Forbidden', step: 'save' }, { status: 403 });
    }
    if (video.storageKey && storageKeyFromClient !== video.storageKey) {
      return NextResponse.json(
        { ok: false, message: 'Storage key mismatch', step: 'save', code: 'STORAGE_KEY_MISMATCH' },
        { status: 400 }
      );
    }
    if (video.uploadStatus !== 'UPLOADING') {
      if (video.uploadStatus === 'UPLOADED') {
        const current = await prisma.video.findUnique({
          where: { id: videoId },
          select: { status: true, processingStatus: true },
        });
        const ready = current?.status === 'READY' && current?.processingStatus === 'READY';
        return NextResponse.json({
          ok: true,
          video: { id: video.id },
          ready: ready === true,
          processing: ready ? 'done' : 'queued',
        });
      }
      return NextResponse.json(
        { ok: false, message: 'Upload not in progress', step: 'upload' },
        { status: 400 }
      );
    }
    if (!video.storageKey) {
      return NextResponse.json({ ok: false, message: 'Missing storage key', step: 'save' }, { status: 400 });
    }

    logOpsEvent('processing_started', { videoId, userId: user.id });

    const storageKey = video.storageKey;

    let playbackUrl: string;
    let playbackSource: 'public' | 'presigned';

    const publicDirect = buildPublicPlaybackUrl(storageKey);
    if (publicDirect) {
      playbackUrl = publicDirect;
      playbackSource = 'public';
      logComplete('info', 'playback URL from public base (no presigner)', {
        videoId,
        storageKey,
        playbackSource,
        urlSample: playbackUrl.length > 96 ? `${playbackUrl.slice(0, 96)}…` : playbackUrl,
      });
    } else {
      try {
        const result = await getPlaybackUrl(storageKey);
        playbackUrl = result.url;
        playbackSource = 'presigned';
        logComplete('info', 'playback URL from presigned GET', {
          videoId,
          storageKey,
          playbackSource,
          hasExpiresAt: Boolean(result.expiresAt),
          urlSample: playbackUrl.length > 96 ? `${playbackUrl.slice(0, 96)}…` : playbackUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        logComplete('error', 'resolve playback URL failed (no public base and presign failed)', {
          videoId,
          storageKey,
          errorMessage: message,
          errorName: err instanceof Error ? err.name : undefined,
          errorStack: stack,
          hint: 'Set R2_PUBLIC_URL to your public bucket base (e.g. https://pub-xxx.r2.dev) so completion does not depend on presigned GET.',
        });
        await prisma.video.update({
          where: { id: videoId },
          data: { uploadStatus: 'FAILED' },
        });
        await logVideoDbRow(videoId, 'after uploadStatus FAILED (playback URL resolution threw)');
        logOpsEvent('processing_failed', { videoId, userId: user.id, errorCode: 'PLAYBACK_URL_FAILED' });
        logOpsEvent('upload_failed', { videoId, userId: user.id, errorCode: 'PLAYBACK_URL_FAILED' });
        logOpsEvent('publish_failed', { videoId, userId: user.id, errorCode: 'PLAYBACK_URL_FAILED' });
        logger.error('VIDEO_UPLOAD_FINALIZE_FAILED', {
          videoId,
          userId: user.id,
          storageKey,
          code: 'PLAYBACK_URL_FAILED',
        });
        return NextResponse.json(
          {
            ok: false,
            message: 'Failed to get playback URL',
            step: 'storage',
            code: 'PLAYBACK_URL_FAILED',
            detail: message,
          },
          { status: 500 }
        );
      }
    }

    const now = new Date();
    const dbPayload = {
      videoUrl: playbackUrl,
      uploadStatus: 'UPLOADED' as const,
      processingStatus: 'PENDING_PROCESSING' as const,
      processingStartedAt: now,
      status: 'PROCESSING' as const,
      processingError: null,
      processingAttempts: 0,
      processingNextAttemptAt: null as Date | null,
    };
    logComplete('info', 'DB transaction: saving video after upload (async pipeline)', {
      videoId,
      playbackSource,
      dbPayload: {
        ...dbPayload,
        videoUrl: dbPayload.videoUrl.length > 120 ? `${dbPayload.videoUrl.slice(0, 120)}…` : dbPayload.videoUrl,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id: videoId },
        data: dbPayload,
      });
      await tx.user.update({
        where: { id: user.id },
        data: { videosCount: { increment: 1 } },
      });
    });

    await rewardUpload(user.id, videoId);

    await logVideoDbRow(videoId, 'after finalize — processing queued');

    logger.info('VIDEO_UPLOAD_FINALIZED', {
      videoId,
      userId: user.id,
      storageKey,
      processing: 'queued',
    });

    logComplete('info', 'complete finished (HTTP 200, async processing)', {
      videoId,
      uploadStatus: 'UPLOADED',
      processingStatus: 'PENDING_PROCESSING',
    });

    logOpsEvent('upload_completed', { videoId, userId: user.id, ready: false });
    /** Do not emit publish_success until worker + moderation gates pass — use upload_completed + processing_queued. */

    return NextResponse.json({
      ok: true,
      video: { id: videoId },
      ready: false,
      processing: 'queued',
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required', step: 'upload' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before completing uploads.', step: 'upload' },
        { status: 403 }
      );
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Invalid input', step: 'upload', errors: e.errors }, { status: 400 });
    }
    logComplete('error', 'complete failed', {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    logOpsEvent('publish_failed', { errorCode: 'COMPLETE_UNHANDLED' });
    logOpsEvent('processing_failed', { errorCode: 'COMPLETE_UNHANDLED' });
    logOpsEvent('upload_failed', { errorCode: 'COMPLETE_UNHANDLED' });
    return NextResponse.json(
      { ok: false, message: 'Complete failed', step: 'process', code: 'UPLOAD_COMPLETE_FAILED' },
      { status: 500 }
    );
  }
}
