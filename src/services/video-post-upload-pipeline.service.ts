/**
 * Post-finalize async pipeline: thumbnail, audio, integrity, vocal enqueue / READY fallback.
 * Invoked by {@link runVideoProcessingWorker} — not by the HTTP finalize handler.
 *
 * State flow (processingStatus): PENDING_PROCESSING → … → ANALYZING_AUDIO (vocal) or READY.
 * ANALYZING_AUDIO completion is usually handled by vocal analysis; use {@link runAnalyzingAudioTailOnly} for stuck jobs.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { checkFfmpegAvailable } from '@/lib/ffmpeg';
import { enqueueAnalysis } from '@/services/vocal-scoring.service';
import { runThumbnailPipelineStep } from '@/services/thumbnail.service';
import { runAudioProcessingPipelineStep } from '@/services/audio-processing.service';
import { runPostUploadIntegrityAnalysis } from '@/services/media-integrity.service';

export type PostUploadPipelineResult = {
  ready: boolean;
  finalStatus: string | null;
  finalProcessingStatus: string | null;
};

/**
 * Enqueue or READY fallback when already in ANALYZING_AUDIO (vocal worker normally completes).
 */
export async function runAnalyzingAudioTailOnly(videoId: string): Promise<PostUploadPipelineResult> {
  const ffmpegCheck = checkFfmpegAvailable();
  const forceMinimal =
    process.env.BETALENT_MINIMAL_MEDIA_PIPELINE === '1' || process.env.BETALENT_SKIP_FFMPEG_PIPELINE === '1';
  const useMinimalMediaPipeline = forceMinimal || !ffmpegCheck.available;

  const updated = await prisma.video.findUnique({
    where: { id: videoId },
    select: { processingStatus: true, status: true },
  });

  let ready = updated?.status === 'READY';

  if (!ready && updated?.processingStatus === 'ANALYZING_AUDIO') {
    if (useMinimalMediaPipeline) {
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
      logger.info('VIDEO_PROCESSING_READY', { videoId, path: 'minimal_media_tail' });
    } else {
      const enqueueResult = await enqueueAnalysis(videoId).catch((e) => {
        logger.warn('VIDEO_VOCAL_ENQUEUE', { videoId, error: e instanceof Error ? e.message : String(e) });
        return { enqueued: false as const, reason: 'ENQUEUE_ERROR' };
      });

      if (!enqueueResult.enqueued) {
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
        logger.info('VIDEO_PROCESSING_READY', { videoId, path: 'enqueue_fallback_tail' });
      }
    }
  }

  const final = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true, processingStatus: true },
  });

  return {
    ready,
    finalStatus: final?.status ?? null,
    finalProcessingStatus: final?.processingStatus ?? null,
  };
}

/**
 * Full pipeline from pre-ANALYZING_AUDIO states. Does not handle ANALYZING_AUDIO (see tail).
 */
export async function runVideoPostUploadPipelineFromPending(videoId: string): Promise<PostUploadPipelineResult> {
  const existing = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      status: true,
      processingStatus: true,
      uploadStatus: true,
      deletedAt: true,
    },
  });

  if (!existing || existing.deletedAt) {
    return { ready: false, finalStatus: null, finalProcessingStatus: null };
  }
  if (existing.uploadStatus !== 'UPLOADED') {
    logger.warn('VIDEO_PROCESSING_SKIP', { videoId, reason: 'upload_not_finalized', uploadStatus: existing.uploadStatus });
    return { ready: false, finalStatus: existing.status, finalProcessingStatus: existing.processingStatus };
  }
  if (existing.status === 'READY' && existing.processingStatus === 'READY') {
    logger.info('VIDEO_PROCESSING_SKIP', { videoId, reason: 'already_ready' });
    return { ready: true, finalStatus: 'READY', finalProcessingStatus: 'READY' };
  }
  if (existing.processingStatus === 'PROCESSING_FAILED') {
    return { ready: false, finalStatus: existing.status, finalProcessingStatus: existing.processingStatus };
  }
  if (existing.processingStatus === 'ANALYZING_AUDIO') {
    return runAnalyzingAudioTailOnly(videoId);
  }

  logger.info('VIDEO_PROCESSING_STARTED', { videoId });

  const ffmpegCheck = checkFfmpegAvailable();
  const forceMinimal =
    process.env.BETALENT_MINIMAL_MEDIA_PIPELINE === '1' || process.env.BETALENT_SKIP_FFMPEG_PIPELINE === '1';
  const useMinimalMediaPipeline = forceMinimal || !ffmpegCheck.available;

  if (useMinimalMediaPipeline) {
    logger.warn('VIDEO_PIPELINE_MINIMAL_MEDIA', {
      videoId,
      reason: forceMinimal ? 'env_forced' : 'ffmpeg_not_available',
      ffmpegAvailable: ffmpegCheck.available,
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
      logger.warn('VIDEO_THUMBNAIL_STEP', { videoId, error: e instanceof Error ? e.message : String(e) });
    }

    try {
      await runAudioProcessingPipelineStep(videoId);
    } catch (e) {
      logger.warn('VIDEO_AUDIO_STEP', { videoId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  try {
    await runPostUploadIntegrityAnalysis(videoId);
  } catch (e) {
    logger.warn('VIDEO_INTEGRITY_STEP', { videoId, error: e instanceof Error ? e.message : String(e) });
  }

  const mid = await prisma.video.findUnique({
    where: { id: videoId },
    select: { processingStatus: true, status: true },
  });

  if (mid?.processingStatus === 'PROCESSING_FAILED') {
    logger.error('VIDEO_PROCESSING_FAILED', { videoId, reason: 'thumbnail_or_audio_failed' });
    return { ready: false, finalStatus: mid.status, finalProcessingStatus: mid.processingStatus };
  }

  let ready = mid?.status === 'READY';

  if (!ready && mid?.processingStatus === 'ANALYZING_AUDIO') {
    const tail = await runAnalyzingAudioTailOnly(videoId);
    ready = tail.ready;
  }

  if (ready) {
    logger.info('VIDEO_PROCESSING_READY', { videoId, path: 'pipeline_complete' });
  }

  const final = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true, processingStatus: true },
  });

  return {
    ready,
    finalStatus: final?.status ?? null,
    finalProcessingStatus: final?.processingStatus ?? null,
  };
}
