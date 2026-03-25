/**
 * BETALENT internal coin economy (engagement/reward only; not real money).
 * All amounts in platform coins.
 */

export const COIN_DAILY_BONUS = 5;
export const COIN_VIDEO_UPLOAD_REWARD = 10;

/** Challenge placement → coins (MVP). Configurable later. */
export const COIN_CHALLENGE_REWARDS: Record<number, number> = {
  1: 1000,
  2: 500,
  3: 250,
};

/** Super vote packages: count → coin cost. */
export const SUPER_VOTE_PACKAGES: Record<number, number> = {
  1: 10,
  5: 45,
  10: 80,
};

export type SuperVotePackageKey = keyof typeof SUPER_VOTE_PACKAGES;
