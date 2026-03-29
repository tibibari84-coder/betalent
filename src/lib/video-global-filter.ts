import type { Prisma } from '@prisma/client';

/** Hide soft-deleted videos from all product queries. */
export const EXCLUDE_DELETED: Prisma.VideoWhereInput = {
  deletedAt: null,
};

export const QUARANTINE_FLAG_REASONS = [
  'STORAGE_DB_DELETE_COMPENSATION',
  'STORAGE_DELETE_FAILED',
] as const;

/**
 * Hide integrity-quarantine rows (storage/DB mismatch or pending storage cleanup failure).
 * Equivalent to excluding rows where mediaIntegrity.flagReason is a quarantine reason.
 */
export const EXCLUDE_QUARANTINE: Prisma.VideoWhereInput = {
  NOT: {
    mediaIntegrity: {
      is: {
        flagReason: { in: [...QUARANTINE_FLAG_REASONS] },
      },
    },
  },
};

/**
 * Use in every listing / discovery / interaction lookup so deleted and quarantined clips never surface.
 */
export const GLOBAL_VIDEO_FILTER: Prisma.VideoWhereInput = {
  AND: [EXCLUDE_DELETED, EXCLUDE_QUARANTINE],
};

/** Single-video lookups for mutations (likes, gifts, votes) — blocks deleted + quarantined. */
export function whereActiveVideoById(id: string): Prisma.VideoWhereInput {
  return { id, ...GLOBAL_VIDEO_FILTER };
}
