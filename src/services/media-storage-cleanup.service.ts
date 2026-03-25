import { prisma } from '@/lib/prisma';
import { deleteVideoStorageObjects } from '@/services/storage-lifecycle.service';
import { deleteStorageObject, extractStorageKeyFromUrl } from '@/lib/storage';

type CleanupCandidate = {
  id: string;
  creatorId: string;
  storageKey: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  mimeType: string | null;
  uploadStatus: string;
  processingStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

const STALE_UPLOADING_HOURS = 6;
const STALE_FAILED_DAYS = 7;
const STALE_HIDDEN_DAYS = 3;
const STALE_PROCESSING_DAYS = 2;

function staleUploadingThreshold(): Date {
  return new Date(Date.now() - STALE_UPLOADING_HOURS * 60 * 60 * 1000);
}

function staleFailedThreshold(): Date {
  return new Date(Date.now() - STALE_FAILED_DAYS * 24 * 60 * 60 * 1000);
}

export async function runMediaStorageCleanup(limit = 200): Promise<{
  scanned: number;
  deletedRows: number;
  updatedRows: number;
  deletedObjects: number;
  neutralizedObjects: number;
  cleanedAvatarRefs: number;
  failures: Array<{ videoId: string; error: string }>;
}> {
  const candidates = await prisma.video.findMany({
    where: {
      OR: [
        { uploadStatus: 'UPLOADING', createdAt: { lt: staleUploadingThreshold() } },
        { uploadStatus: 'FAILED', updatedAt: { lt: staleFailedThreshold() } },
        {
          status: 'HIDDEN',
          updatedAt: { lt: new Date(Date.now() - STALE_HIDDEN_DAYS * 24 * 60 * 60 * 1000) },
          OR: [{ storageKey: { not: null } }, { videoUrl: { not: null } }, { thumbnailUrl: { not: null } }],
        },
        {
          status: 'PROCESSING',
          uploadStatus: 'UPLOADED',
          updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_DAYS * 24 * 60 * 60 * 1000) },
        },
      ],
    },
    take: Math.max(1, Math.min(limit, 1000)),
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      creatorId: true,
      storageKey: true,
      videoUrl: true,
      thumbnailUrl: true,
      mimeType: true,
      uploadStatus: true,
      processingStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let deletedRows = 0;
  let updatedRows = 0;
  let deletedObjects = 0;
  let neutralizedObjects = 0;
  let cleanedAvatarRefs = 0;
  const failures: Array<{ videoId: string; error: string }> = [];

  for (const video of candidates as CleanupCandidate[]) {
    const storageDelete = await deleteVideoStorageObjects(video);
    if (storageDelete.failed.length > 0) {
      failures.push({
        videoId: video.id,
        error: `storage delete failed: ${storageDelete.failed.map((f) => `${f.key}:${f.error}`).join(', ')}`,
      });
      continue;
    }
    deletedObjects += storageDelete.deleted.length;
    neutralizedObjects += storageDelete.neutralized.length;
    try {
      if (video.uploadStatus === 'UPLOADING' || video.uploadStatus === 'FAILED') {
        await prisma.video.delete({ where: { id: video.id } });
        deletedRows++;
        console.info('[media-cleanup] removed stale video row', {
          videoId: video.id,
          uploadStatus: video.uploadStatus,
          processingStatus: video.processingStatus,
        });
      } else {
        await prisma.video.update({
          where: { id: video.id },
          data: {
            videoUrl: null,
            thumbnailUrl: null,
            storageKey: null,
          },
        });
        updatedRows++;
        console.info('[media-cleanup] cleared residual storage refs on video row', {
          videoId: video.id,
          uploadStatus: video.uploadStatus,
          processingStatus: video.processingStatus,
          status: 'HIDDEN_OR_STALE_PROCESSING',
        });
      }
    } catch (error) {
      failures.push({
        videoId: video.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Avatar cleanup (safe, DB-known only): remove avatar refs that are malformed/unrecoverable.
  const usersWithAvatar = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    take: Math.max(1, Math.min(limit, 1000)),
    select: { id: true, avatarUrl: true },
  });
  for (const user of usersWithAvatar) {
    const avatarUrl = user.avatarUrl ?? '';
    const key = extractStorageKeyFromUrl(avatarUrl);
    if (!key) continue;
    // If URL already points to canonical key and user still references it, keep.
    // Cleanup path is limited to rows that have been logically cleared but reference remains.
    if (avatarUrl.trim().length === 0) continue;
    if (!avatarUrl.includes('/avatars/')) continue;
    // No DB history exists for old avatar keys, so cron can only clean broken references.
    // When URL is parseable and user has no reachable avatar endpoint, drop reference + object.
    // Here "broken" means avatar URL points to a storage key while user account is blocked.
    if (user.id) {
      const account = await prisma.user.findUnique({
        where: { id: user.id },
        select: { moderationStatus: true },
      });
      if (account?.moderationStatus === 'BANNED') {
        const deleted = await deleteStorageObject(key);
        if (deleted.ok) {
          await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: null },
          });
          cleanedAvatarRefs++;
        }
      }
    }
  }

  return {
    scanned: candidates.length,
    deletedRows,
    updatedRows,
    deletedObjects,
    neutralizedObjects,
    cleanedAvatarRefs,
    failures,
  };
}
