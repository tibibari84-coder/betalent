/**
 * In-memory TTL cache for For You feed performance.
 * Production: consider Redis for multi-instance deployments.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Clean expired entries periodically. */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if ((entry as CacheEntry<unknown>).expiresAt <= now) {
      store.delete(key);
    }
  }
}
const CLEANUP_INTERVAL_MS = 60_000;
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  if (ttlSeconds <= 0) {
    store.delete(key);
    return;
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/** TTL constants (seconds). */
export const CACHE_TTL = {
  FEED: 75,
  CANDIDATE_BUCKET: 60,
  AFFINITY: 120,
  TRENDING: 60,
  /** Challenge vote summary: 30s for leaderboard/summary pages. */
  CHALLENGE_VOTE_SUMMARY: 30,
} as const;
