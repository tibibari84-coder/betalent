/**
 * Background hard-delete for soft-deleted videos: remove R2 objects, then remove DB row.
 * Does not adjust videosCount (already decremented on soft delete).
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { deleteVideoStorageObjects } from '@/services/storage-lifecycle.service';

export type VideoCleanupWorkerResult = {
  candidates: number;
  hardDeleted: number;
  storageFailures: number;
};

export async function runVideoCleanupWorker(batchSize = 25): Promise<VideoCleanupWorkerResult> {
  const candidates = await prisma.video.findMany({
    where: { deletedAt: { not: null } },
    take: batchSize,
    orderBy: { deletedAt: 'asc' },
    select: {
      id: true,
      creatorId: true,
      storageKey: true,
      videoUrl: true,
      thumbnailUrl: true,
      mimeType: true,
    },
  });

  let hardDeleted = 0;
  let storageFailures = 0;

  for (const video of candidates) {
    const storageDelete = await deleteVideoStorageObjects(video);

    if (storageDelete.failed.length > 0) {
      storageFailures += 1;
      const keys = storageDelete.failed.map((f) => f.key);
      logger.error('VIDEO_DELETE_STORAGE_FAIL', {
        videoId: video.id,
        userId: video.creatorId,
        keys,
        errors: storageDelete.failed.map((f) => f.error),
      });

      await prisma.$transaction(async (tx) => {
        await tx.mediaIntegrityAnalysis.upsert({
          where: { videoId: video.id },
          create: {
            videoId: video.id,
            moderationStatus: 'BLOCKED',
            originalityStatus: 'CLEAN',
            flagReason: 'STORAGE_DELETE_FAILED',
            reviewedAt: new Date(),
          },
          update: {
            moderationStatus: 'BLOCKED',
            flagReason: 'STORAGE_DELETE_FAILED',
            reviewedAt: new Date(),
          },
        });
        await tx.videoDeleteRetry.upsert({
          where: { videoId: video.id },
          create: {
            videoId: video.id,
            failedKeys: keys,
            attempts: 1,
            lastError: storageDelete.failed.map((f) => `${f.key}: ${f.error}`).join('; '),
          },
          update: {
            failedKeys: keys,
            attempts: { increment: 1 },
            lastError: storageDelete.failed.map((f) => `${f.key}: ${f.error}`).join('; '),
          },
        });
      });
      continue;
    }

    try {
      await prisma.video.delete({ where: { id: video.id } });
      hardDeleted += 1;
      logger.info('VIDEO_HARD_DELETED_AFTER_STORAGE', {
        videoId: video.id,
        userId: video.creatorId,
        deletedStorageKeys: storageDelete.deleted.length,
      });
    } catch (e) {
      logger.error('VIDEO_HARD_DELETE_DB_FAIL', {
        videoId: video.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { candidates: candidates.length, hardDeleted, storageFailures };
}
