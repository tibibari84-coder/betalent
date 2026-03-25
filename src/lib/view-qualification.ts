/**
 * Rules for when a client-reported watch qualifies for a public view increment.
 * Server recomputes from Video.durationSec; client duration is optional cross-check only.
 */

const MIN_ABSOLUTE_SECONDS = 2.5;
const MIN_FRACTION_OF_DURATION = 0.3;
/** Cap minimum watch requirement so very long videos don't require minutes for one count */
const MAX_MINIMUM_SECONDS = 45;

/**
 * Minimum seconds of playback required before a view may count.
 * = max(2.5s, 30% of duration), capped at MAX_MINIMUM_SECONDS, never exceeds duration.
 */
export function getRequiredQualifiedWatchSeconds(durationSec: number): number {
  const d = Math.max(0, durationSec);
  if (d <= 0) return MIN_ABSOLUTE_SECONDS;
  const fromPct = d * MIN_FRACTION_OF_DURATION;
  const raw = Math.max(MIN_ABSOLUTE_SECONDS, fromPct);
  const capped = Math.min(raw, MAX_MINIMUM_SECONDS, d);
  return Math.max(MIN_ABSOLUTE_SECONDS, capped);
}
