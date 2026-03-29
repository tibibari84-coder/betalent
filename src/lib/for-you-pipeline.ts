/**
 * For You & discovery ranking — **pipeline eligibility** (single source of truth).
 *
 * All candidate pools, scoring, and trending surfaces that represent “public discovery”
 * must filter videos with {@link FOR_YOU_ELIGIBLE_VIDEO_WHERE}.
 *
 * This is an alias of {@link CANONICAL_PUBLIC_VIDEO_WHERE} from the upload/processing/moderation
 * architecture. A video is eligible only when:
 * - `uploadStatus === UPLOADED` (storage finalize complete)
 * - `status === READY` and `processingStatus === READY`
 * - `moderationStatus === APPROVED`
 * - `visibility === PUBLIC`
 * - `videoUrl` set; `rankingDisabled === false`
 * - Not soft-deleted; not integrity-quarantined (see `GLOBAL_VIDEO_FILTER`)
 * - Integrity sub-record allows public surfacing when present
 *
 * Do **not** re-implement these rules in ad-hoc queries — import this constant or
 * `CANONICAL_PUBLIC_VIDEO_WHERE` from `@/lib/video-moderation` (they are equivalent).
 */

import type { Prisma } from '@prisma/client';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';

/** Alias for discovery code paths — identical to canonical public-ready gate. */
export const FOR_YOU_ELIGIBLE_VIDEO_WHERE: Prisma.VideoWhereInput = CANONICAL_PUBLIC_VIDEO_WHERE;

/**
 * Documented pipeline stages (orchestrator: `getForYouFeedV2`).
 * Used for comments, diagnostics, and onboarding — not runtime state.
 */
export const FOR_YOU_PIPELINE_STAGES = [
  'A: candidate_pools',
  'B: lightweight_score_filter',
  'C: feature_extract + primary_score',
  'C2: post_hoc_multipliers',
  'D: personalized_exploration_assembly',
  'E: diversity_caps',
] as const;
