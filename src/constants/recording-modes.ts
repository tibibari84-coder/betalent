/**
 * Shared recording mode caps. Uses VIDEO_LIMITS as single source of truth.
 */

import { VIDEO_LIMITS } from './video-limits';

export type RecordingMode = 'standard' | 'live';

/** Standard upload + Recording Studio cap (seconds). */
export const STANDARD_RECORDING_MAX_DURATION_SEC = VIDEO_LIMITS.STANDARD;

/** Live challenge recording cap (seconds). */
export const LIVE_RECORDING_MAX_DURATION_SEC = VIDEO_LIMITS.LIVE;

/**
 * Coalesce value when Challenge.maxDurationSec is null or invalid.
 * Platform default for standard cover challenges = 90s.
 */
export const CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT = VIDEO_LIMITS.STANDARD;

export function getRecordingMaxDurationSec(mode: RecordingMode): number {
  return mode === 'live' ? VIDEO_LIMITS.LIVE : VIDEO_LIMITS.STANDARD;
}

/**
 * Effective max performance length for a challenge (seconds).
 * Formula: min(LIVE cap, max(1, challengeMaxDurationSec)).
 */
export function getLiveChallengeRecordingCapSec(challengeMaxDurationSec: number): number {
  return Math.min(VIDEO_LIMITS.LIVE, Math.max(1, challengeMaxDurationSec));
}
