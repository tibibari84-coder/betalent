/**
 * BETALENT Verified Creator – levels, labels, and trust ranking weight.
 * Verification increases trust; do not let it unfairly dominate rankings.
 */

import type { CreatorVerificationLevel } from '@prisma/client';

export const CREATOR_VERIFICATION_LEVELS: CreatorVerificationLevel[] = [
  'STANDARD_CREATOR',
  'IDENTITY_VERIFIED',
  'TRUSTED_PERFORMER',
  'OFFICIAL_ARTIST',
];

export const CREATOR_VERIFICATION_LABELS: Record<CreatorVerificationLevel, string> = {
  STANDARD_CREATOR: 'Standard creator',
  IDENTITY_VERIFIED: 'Identity verified',
  TRUSTED_PERFORMER: 'Trusted performer',
  OFFICIAL_ARTIST: 'Official artist',
};

/** Slight ranking weight multiplier for verified creators (one signal among many). Max 1.15. */
export const VERIFICATION_RANKING_WEIGHT: Record<CreatorVerificationLevel, number> = {
  STANDARD_CREATOR: 1,
  IDENTITY_VERIFIED: 1.05,
  TRUSTED_PERFORMER: 1.1,
  OFFICIAL_ARTIST: 1.15,
};

export function getVerificationRankingMultiplier(level: CreatorVerificationLevel): number {
  return VERIFICATION_RANKING_WEIGHT[level] ?? 1;
}
