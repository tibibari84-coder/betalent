/**
 * Stale UPLOADING rows: remove orphan storage object (partial/abandoned upload), then mark upload failed.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { deleteStorageObject } from '@/lib/storage';
import { STALE_UPLOADING_HOURS } from '@/constants/video-pipeline';

export type StaleUploadCleanupWorkerResult = {
  markedFailed: number;
  storageDeleted: number;
  storageDeleteFailed: number;
};

export async function runStaleUploadCleanupWorker(batchSize = 50): Promise<StaleUploadCleanupWorkerResult> {
  const threshold = new Date(Date.now() - STALE_UPLOADING_HOURS * 60 * 60 * 1000);

  const stale = await prisma.video.findMany({
    where: {
      uploadStatus: 'UPLOADING',
      deletedAt: null,
      updatedAt: { lt: threshold },
    },
    take: batchSize,
    orderBy: { updatedAt: 'asc' },
    select: { id: true, creatorId: true, storageKey: true },
  });

  let markedFailed = 0;
  let storageDeleted = 0;
  let storageDeleteFailed = 0;

  for (const v of stale) {
    const key = v.storageKey?.trim();
    if (key) {
      const del = await deleteStorageObject(key);
      if (del.ok) {
        storageDeleted += 1;
        logger.info('VIDEO_STALE_UPLOAD_STORAGE_REMOVED', {
          videoId: v.id,
          userId: v.creatorId,
          storageKey: key,
        });
      } else {
        storageDeleteFailed += 1;
        logger.error('VIDEO_CLEANUP_STORAGE_FAIL', {
          videoId: v.id,
          userId: v.creatorId,
          storageKey: key,
          error: del.error,
        });
      }
    }

    await prisma.video.update({
      where: { id: v.id },
      data: {
        uploadStatus: 'FAILED',
        processingError: `Stale upload (no finalize within ${STALE_UPLOADING_HOURS}h)`,
        updatedAt: new Date(),
      },
    });
    markedFailed += 1;
    logger.warn('VIDEO_UPLOAD_STALE_FAILED', {
      videoId: v.id,
      userId: v.creatorId,
      storageKey: key ?? undefined,
    });
  }

  return { markedFailed, storageDeleted, storageDeleteFailed };
}
