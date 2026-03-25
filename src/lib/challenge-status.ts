/**
 * Challenge timing vs lifecycle vs session (keep these separate in UI):
 *
 * - **DB status** (`Challenge.status`): operational lifecycle (ENTRY_OPEN, LIVE_ACTIVE, …). Authoritative for
 *   join/vote rules in APIs — not the same as “a stream is live”.
 * - **Regional windows** (`ChallengeWindow` startsAt/endsAt): schedule-only; use `isRegionalWindowOpenNow`.
 * - **LiveChallengeSession.status**: operator-controlled stage UI; only when session is LIVE does the arena
 *   show the interactive `LiveChallengeView` — not implied by LIVE_ACTIVE alone.
 *
 * `getChallengeDisplayStatus` is **timestamp-derived** (countdown / phase copy), not DB status.
 */

export type ChallengeDisplayStatus = 'upcoming' | 'active' | 'live' | 'ended';

/** True when current time falls inside any window’s [startsAt, endsAt] (schedule only; not a video stream). */
export function isRegionalWindowOpenNow(
  windows: Array<{ startsAt: string | Date; endsAt: string | Date }> | undefined,
  now: Date = new Date()
): boolean {
  const t = now.getTime();
  return (
    windows?.some((w) => {
      const s = new Date(w.startsAt).getTime();
      const e = new Date(w.endsAt).getTime();
      return t >= s && t <= e;
    }) ?? false
  );
}

export interface ChallengeTimestamps {
  startAt: Date;
  endAt: Date;
  liveStartAt?: Date | null;
}

/**
 * Compute challenge display status from timestamps.
 *
 * - upcoming: now < startAt
 * - active: startAt <= now < liveStartAt (or endAt if no liveStartAt)
 * - live: liveStartAt <= now <= endAt
 * - ended: now > endAt
 */
export function getChallengeDisplayStatus(
  timestamps: ChallengeTimestamps,
  now: Date = new Date()
): ChallengeDisplayStatus {
  const { startAt, endAt, liveStartAt } = timestamps;
  const t = now.getTime();
  const start = startAt.getTime();
  const end = endAt.getTime();

  if (t < start) return 'upcoming';
  if (t > end) return 'ended';

  const liveStart = liveStartAt ? liveStartAt.getTime() : null;
  if (liveStart != null && t >= liveStart) return 'live';

  return 'active';
}
