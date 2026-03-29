/**
 * Async video processing after direct upload finalize (thumbnail, audio, integrity, vocal enqueue).
 * Retries use {@link processingBackoffMsAfterAttempt} via `processingNextAttemptAt` — no tight loops.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  MAX_VIDEO_PROCESSING_ATTEMPTS,
  processingBackoffMsAfterAttempt,
  STUCK_ANALYZING_AUDIO_MINUTES,
  STUCK_ANALYZING_TAIL_COOLDOWN_MS,
} from '@/constants/video-pipeline';
import {
  runAnalyzingAudioTailOnly,
  runVideoPostUploadPipelineFromPending,
} from '@/services/video-post-upload-pipeline.service';

export type VideoProcessingWorkerResult = {
  processed: number;
  readyCount: number;
  failedPermanent: number;
  stuckTailHandled: number;
  errors: number;
};

const MID_PIPELINE: Array<
  'PENDING_PROCESSING' | 'GENERATING_THUMBNAIL' | 'PROCESSING_AUDIO' | 'CHECKING_INTEGRITY'
> = ['PENDING_PROCESSING', 'GENERATING_THUMBNAIL', 'PROCESSING_AUDIO', 'CHECKING_INTEGRITY'];

function processingEligibleNowWhere(): Prisma.VideoWhereInput {
  const now = new Date();
  return {
    OR: [{ processingNextAttemptAt: null }, { processingNextAttemptAt: { lte: now } }],
  };
}

export async function runVideoProcessingWorker(batchSize = 15): Promise<VideoProcessingWorkerResult> {
  let processed = 0;
  let readyCount = 0;
  let failedPermanent = 0;
  let stuckTailHandled = 0;
  let errors = 0;

  const candidates = await prisma.video.findMany({
    where: {
      uploadStatus: 'UPLOADED',
      deletedAt: null,
      status: 'PROCESSING',
      processingStatus: { in: MID_PIPELINE },
      processingAttempts: { lt: MAX_VIDEO_PROCESSING_ATTEMPTS },
      ...processingEligibleNowWhere(),
    },
    take: batchSize,
    orderBy: { updatedAt: 'asc' },
    select: { id: true, creatorId: true, storageKey: true },
  });

  for (const row of candidates) {
    try {
      const attempt = await prisma.$transaction(async (tx) => {
        const v = await tx.video.findFirst({
          where: {
            id: row.id,
            uploadStatus: 'UPLOADED',
            deletedAt: null,
            status: 'PROCESSING',
            processingStatus: { in: MID_PIPELINE },
            processingAttempts: { lt: MAX_VIDEO_PROCESSING_ATTEMPTS },
            OR: [{ processingNextAttemptAt: null }, { processingNextAttemptAt: { lte: new Date() } }],
          },
          select: { id: true, processingAttempts: true },
        });
        if (!v) return null;
        await tx.video.update({
          where: { id: v.id },
          data: { processingAttempts: { increment: 1 } },
        });
        return v.processingAttempts + 1;
      });

      if (attempt === null) continue;

      logger.info('VIDEO_PROCESSING_ATTEMPT', {
        videoId: row.id,
        userId: row.creatorId,
        attempt,
      });

      const result = await runVideoPostUploadPipelineFromPending(row.id);
      processed += 1;
      if (result.ready) {
        readyCount += 1;
        await prisma.video.update({
          where: { id: row.id },
          data: { processingNextAttemptAt: null },
        });
        continue;
      }

      const after = await prisma.video.findUnique({
        where: { id: row.id },
        select: { processingStatus: true, processingAttempts: true, status: true },
      });
      if (
        after &&
        after.status === 'PROCESSING' &&
        MID_PIPELINE.includes(after.processingStatus as (typeof MID_PIPELINE)[number]) &&
        after.processingAttempts >= MAX_VIDEO_PROCESSING_ATTEMPTS
      ) {
        await prisma.video.update({
          where: { id: row.id },
          data: {
            processingStatus: 'PROCESSING_FAILED',
            status: 'FAILED',
            processingError: `Max processing attempts (${MAX_VIDEO_PROCESSING_ATTEMPTS}) exceeded (mid-pipeline)`,
            processingCompletedAt: new Date(),
            processingNextAttemptAt: null,
          },
        });
        logger.error('VIDEO_PROCESSING_FAILED', {
          videoId: row.id,
          userId: row.creatorId,
          storageKey: row.storageKey ?? undefined,
          reason: 'max_attempts_mid_pipeline',
        });
        failedPermanent += 1;
        continue;
      }

      if (
        after &&
        after.status === 'PROCESSING' &&
        MID_PIPELINE.includes(after.processingStatus as (typeof MID_PIPELINE)[number]) &&
        after.processingAttempts < MAX_VIDEO_PROCESSING_ATTEMPTS
      ) {
        const delayMs = processingBackoffMsAfterAttempt(after.processingAttempts);
        await prisma.video.update({
          where: { id: row.id },
          data: {
            processingNextAttemptAt: new Date(Date.now() + delayMs),
          },
        });
        logger.info('VIDEO_PROCESSING_BACKOFF_SCHEDULED', {
          videoId: row.id,
          userId: row.creatorId,
          attempt: after.processingAttempts,
          delayMs,
        });
      }
    } catch (e) {
      errors += 1;
      logger.error('VIDEO_PROCESSING_WORKER_ERROR', {
        videoId: row.id,
        error: e instanceof Error ? e.message : String(e),
      });
      const v = await prisma.video.findUnique({
        where: { id: row.id },
        select: { processingAttempts: true, status: true, processingStatus: true },
      });
      if (
        v &&
        v.status === 'PROCESSING' &&
        MID_PIPELINE.includes(v.processingStatus as (typeof MID_PIPELINE)[number]) &&
        v.processingAttempts > 0 &&
        v.processingAttempts < MAX_VIDEO_PROCESSING_ATTEMPTS
      ) {
        const delayMs = processingBackoffMsAfterAttempt(v.processingAttempts);
        await prisma.video.update({
          where: { id: row.id },
          data: { processingNextAttemptAt: new Date(Date.now() + delayMs) },
        });
        logger.info('VIDEO_PROCESSING_BACKOFF_AFTER_ERROR', {
          videoId: row.id,
          attempt: v.processingAttempts,
          delayMs,
        });
      }
    }
  }

  const stuckBefore = new Date(Date.now() - STUCK_ANALYZING_AUDIO_MINUTES * 60 * 1000);
  const stuckRows = await prisma.video.findMany({
    where: {
      uploadStatus: 'UPLOADED',
      deletedAt: null,
      status: 'PROCESSING',
      processingStatus: 'ANALYZING_AUDIO',
      updatedAt: { lt: stuckBefore },
      ...processingEligibleNowWhere(),
    },
    take: batchSize,
    orderBy: { updatedAt: 'asc' },
    select: { id: true, creatorId: true, storageKey: true },
  });

  for (const row of stuckRows) {
    try {
      logger.warn('VIDEO_PROCESSING_STUCK_ANALYZING', {
        videoId: row.id,
        userId: row.creatorId,
        storageKey: row.storageKey ?? undefined,
      });
      await runAnalyzingAudioTailOnly(row.id);
      stuckTailHandled += 1;

      const tailAfter = await prisma.video.findUnique({
        where: { id: row.id },
        select: { processingStatus: true, status: true },
      });
      if (tailAfter?.status === 'PROCESSING' && tailAfter.processingStatus === 'ANALYZING_AUDIO') {
        await prisma.video.update({
          where: { id: row.id },
          data: {
            processingNextAttemptAt: new Date(Date.now() + STUCK_ANALYZING_TAIL_COOLDOWN_MS),
          },
        });
        logger.info('VIDEO_PROCESSING_STUCK_TAIL_BACKOFF', {
          videoId: row.id,
          delayMs: STUCK_ANALYZING_TAIL_COOLDOWN_MS,
        });
      } else if (tailAfter?.status === 'READY' && tailAfter.processingStatus === 'READY') {
        await prisma.video.update({
          where: { id: row.id },
          data: { processingNextAttemptAt: null },
        });
      }
    } catch (e) {
      errors += 1;
      logger.error('VIDEO_PROCESSING_STUCK_TAIL_ERROR', {
        videoId: row.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { processed, readyCount, failedPermanent, stuckTailHandled, errors };
}
