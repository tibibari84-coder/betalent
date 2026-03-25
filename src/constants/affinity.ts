/**
 * User taste / affinity tracking – time-decay and limits.
 */

/** Half-life for time-decay (hours). Recent behavior weighs more than old. */
export const AFFINITY_HALF_LIFE_HOURS = 168; // 7 days

/** Max signals to fetch per type (likes, follows, watches). */
export const AFFINITY_LIMIT = 300;

/** Completion threshold for positive watch signal (≥70% = strong preference). */
export const POSITIVE_WATCH_PCT = 0.7;

/** Completion threshold for skip signal (<20% = negative preference). */
export const SKIP_WATCH_PCT = 0.2;
