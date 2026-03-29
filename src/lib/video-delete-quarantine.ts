import type { Prisma } from '@prisma/client';

/**
 * Rows quarantined when storage was removed but `prisma.video.delete` threw (see DELETE /api/videos/[id]).
 * They must not appear in creator-facing lists.
 */
export const excludeStorageDeleteQuarantine: Prisma.VideoWhereInput = {
  OR: [
    { mediaIntegrity: { is: null } },
    { mediaIntegrity: { flagReason: { not: 'STORAGE_DB_DELETE_COMPENSATION' } } },
  ],
};
