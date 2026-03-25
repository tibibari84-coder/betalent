/**
 * Shared UI formatting helpers.
 * Keep output stable across pages by centralizing duplicated format logic.
 */

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatChallengeCountdown(endAt: Date | string): string {
  const t = typeof endAt === 'string' ? new Date(endAt).getTime() : endAt.getTime();
  const diff = Math.max(0, t - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d} day${d !== 1 ? 's' : ''}`;
  if (h > 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return 'Ending soon';
}
