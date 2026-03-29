/**
 * POST /api/videos/upload/complete
 *
 * Creator flow chain: Upload → Save → Process → Thumbnail → READY → Feed → Open Performance.
 * This route does: Save (videoUrl, UPLOADED) → Process (PENDING_PROCESSING) → Thumbnail → READY (or enqueue analysis).
 * On success returns { ok: true, video: { id }, ready }.
 * On failure returns { ok: false, message, step } so client can report which step is missing.
 */

import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildPublicPlaybackUrl, getPlaybackUrl, getStorageConfig, isValidVideoStorageKeyForUser } from '@/lib/storage';
import { checkFfmpegAvailable } from '@/lib/ffmpeg';
import { rewardUpload } from '@/services/coin.service';
import { enqueueAnalysis } from '@/services/vocal-scoring.service';
import { runThumbnailPipelineStep } from '@/services/thumbnail.service';
import { runAudioProcessingPipelineStep } from '@/services/audio-processing.service';
import { runPostUploadIntegrityAnalysis } from '@/services/media-integrity.service';
import { RATE_LIMIT_UPLOAD_COMPLETE_PER_HOUR } from '@/constants/api-rate-limits';
import { logOpsEvent } from '@/lib/ops-events';

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
        const current = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true } });
        return NextResponse.json({ ok: true, video: { id: video.id }, ready: current?.status === 'READY' });
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
    };
    logComplete('info', 'DB transaction: saving video after upload', {
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

    /**
     * Thumbnail + audio steps require FFmpeg (`thumbnail.service.ts` assertFfmpegAvailable →
     * PROCESSING_FAILED at lines 101–108; `audio-processing.service.ts` same at 290–298).
     * If we always ran them when ffmpeg is missing, complete would return 200 but the row would
     * become PROCESSING_FAILED — Profile shows badge "Failed"; For You stays empty (not READY).
     * When ffmpeg is unavailable, skip those steps and advance to ANALYZING_AUDIO so enqueue/fallback can run.
     */
    const ffmpegCheck = checkFfmpegAvailable();
    const forceMinimal =
      process.env.BETALENT_MINIMAL_MEDIA_PIPELINE === '1' || process.env.BETALENT_SKIP_FFMPEG_PIPELINE === '1';
    const useMinimalMediaPipeline = forceMinimal || !ffmpegCheck.available;

    if (useMinimalMediaPipeline) {
      logComplete('warn', 'skipping ffmpeg thumbnail + loudness pipeline', {
        videoId,
        reason: forceMinimal ? 'env_forced' : 'ffmpeg_not_available',
        ffmpegAvailable: ffmpegCheck.available,
        ffmpegError: ffmpegCheck.error ?? null,
        reference:
          'Without this branch, runThumbnailPipelineStep calls assertFfmpegAvailable() and writes processingStatus PROCESSING_FAILED (thumbnail.service.ts ~101–108).',
      });
      await prisma.video.update({
        where: { id: videoId },
        data: {
          processingStatus: 'ANALYZING_AUDIO',
          processingError: null,
          updatedAt: new Date(),
        },
      });
    } else {
      try {
        await runThumbnailPipelineStep(videoId);
      } catch (e) {
        logComplete('warn', 'thumbnail step threw', { videoId, error: e instanceof Error ? e.message : String(e) });
      }

      try {
        await runAudioProcessingPipelineStep(videoId);
      } catch (e) {
        logComplete('warn', 'audio processing step threw', {
          videoId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    try {
      await runPostUploadIntegrityAnalysis(videoId);
    } catch (e) {
      logComplete('warn', 'post-upload integrity failed', { videoId, error: e instanceof Error ? e.message : String(e) });
    }

    const updated = await prisma.video.findUnique({
      where: { id: videoId },
      select: { processingStatus: true, status: true, videoUrl: true },
    });

    let ready = updated?.status === 'READY';
    /**
     * Full pipeline: enqueueAnalysis() may return { enqueued: true } (vocal-scoring.service.ts ~237–238).
     * The previous fallback only ran when enqueued was false — so ANALYZING_AUDIO + PENDING moderation
     * stayed forever if no worker consumed the job (typical local dev).
     * Minimal media pipeline (no ffmpeg): never wait on a worker; finalize DB to READY/APPROVED here.
     * uploadStatus stays UPLOADED (not modified).
     */
    if (!ready && updated?.processingStatus === 'ANALYZING_AUDIO') {
      if (useMinimalMediaPipeline) {
        logComplete('info', 'minimal media pipeline: finalize READY/APPROVED without vocal worker', {
          videoId,
          note: 'Skips enqueueAnalysis so the row does not depend on a background worker.',
        });
        await prisma.video.update({
          where: { id: videoId },
          data: {
            processingStatus: 'READY',
            status: 'READY',
            moderationStatus: 'APPROVED',
            processingCompletedAt: new Date(),
            processingError: null,
          },
        });
        ready = true;
      } else {
        const enqueueResult = await enqueueAnalysis(videoId).catch((e) => {
          logComplete('warn', 'enqueueAnalysis threw', { videoId, error: e instanceof Error ? e.message : String(e) });
          return { enqueued: false as const, reason: 'ENQUEUE_ERROR' };
        });

        if (!enqueueResult.enqueued) {
          logComplete('info', 'analysis not enqueued, marking READY fallback', {
            videoId,
            reason: enqueueResult.reason ?? 'unknown',
          });
          await prisma.video.update({
            where: { id: videoId },
            data: {
              processingStatus: 'READY',
              status: 'READY',
              moderationStatus: 'APPROVED',
              processingCompletedAt: new Date(),
              processingError: null,
            },
          });
          ready = true;
        }
      }
    }

    await logVideoDbRow(videoId, 'after processing + enqueue/fallback');

    const final = await prisma.video.findUnique({
      where: { id: videoId },
      select: { status: true, processingStatus: true, uploadStatus: true, videoUrl: true },
    });
    logComplete('info', 'complete finished (HTTP 200)', {
      videoId,
      status: final?.status,
      processingStatus: final?.processingStatus,
      uploadStatus: final?.uploadStatus,
      hasVideoUrl: !!final?.videoUrl,
      videoUrlSample:
        final?.videoUrl && final.videoUrl.length > 120 ? `${final.videoUrl.slice(0, 120)}…` : final?.videoUrl ?? null,
      ready,
    });

    logOpsEvent('upload_completed', { videoId, userId: user.id, ready });
    logOpsEvent('processing_ready', { videoId, userId: user.id, ready });
    logOpsEvent('publish_success', { videoId, userId: user.id, ready });

    return NextResponse.json({ ok: true, video: { id: videoId }, ready });
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
