/**
 * Single source of truth for video duration limits across BETALENT.
 * Used everywhere: frontend, backend validation, studio recorder, upload, live.
 *
 * - STANDARD: max duration for regular uploads and Recording Studio
 * - LIVE: max duration for live challenge performances
 */
export const VIDEO_LIMITS = {
  STANDARD: 90,
  LIVE: 150,
} as const;

export const VIDEO_LIMITS_STANDARD_SEC = VIDEO_LIMITS.STANDARD;
export const VIDEO_LIMITS_LIVE_SEC = VIDEO_LIMITS.LIVE;
