/** Max background processing worker runs per video before permanent PROCESSING_FAILED. */
export const MAX_VIDEO_PROCESSING_ATTEMPTS = 5;

/** ANALYZING_AUDIO (vocal queue) stuck → run enqueue/fallback tail only. */
export const STUCK_ANALYZING_AUDIO_MINUTES = 90;

/** Minimum spacing between stuck ANALYZING_AUDIO tail retries (same field as main backoff). */
export const STUCK_ANALYZING_TAIL_COOLDOWN_MS = 10 * 60 * 1000;

/** UPLOADING without finalize → mark upload failed. */
export const STALE_UPLOADING_HOURS = 2;

/**
 * After attempt N completes without reaching READY, wait this long before the worker may retry.
 * N uses post-increment attempts (1..MAX). Capped to avoid hour-long stalls.
 */
export function processingBackoffMsAfterAttempt(attempt: number): number {
  const minMs = 60_000;
  const exp = Math.min(Math.max(attempt, 0), 8);
  return Math.min(minMs * 2 ** exp, 32 * 60_000);
}
