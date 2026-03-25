# Performance Fixes Implemented

*Based on [PERFORMANCE-AUDIT-FOR-YOU.md](./PERFORMANCE-AUDIT-FOR-YOU.md). Implemented in priority order.*

---

## 1. Missing Indexes

**Migration:** `prisma/migrations/20260327000000_add_feed_performance_indexes/migration.sql`

| Table | Index | Purpose |
|-------|-------|---------|
| **VideoWatchStats** | `(viewCount, completedViewsCount DESC, totalWatchSeconds DESC)` | Retention bucket query: avoids full scan + sort |
| **UserWatchInteraction** | `(userId, lastWatchedAt)` | `getRecentlyWatchedVideoIds`: range on lastWatchedAt per user |
| **Like** | `(userId, createdAt DESC)` | Affinity query: order by createdAt for user |
| **Like** | `(createdAt)` | Trending groupBy: filter by createdAt |
| **GiftTransaction** | `(videoId, createdAt)` | Trending groupBy: filter by createdAt per video |
| **ChallengeEntry** | `(videoId)` | Challenge bucket: join through video relation |

**Apply:** `npx prisma migrate deploy`

---

## 2. Candidate Bucket Caching

**File:** `src/services/for-you/candidates.service.ts`

- Added per-bucket fetchers with 60s TTL cache:
  - `fetchRetention()` → `candidates:retention`
  - `fetchSupport()` → `candidates:support`
  - `fetchEngagement()` → `candidates:engagement`
  - `fetchFresh()` → `candidates:fresh`
  - `fetchChallenge(now)` → `candidates:challenge`
  - `fetchRising()` → `candidates:rising`
- Personalized buckets (byCategory, byCreator) remain uncached (user-specific).
- Exploration bucket remains uncached (depends on preferred categories).

**Effect:** Cache hit avoids 6 of 8 candidate queries.

---

## 3. Per-User Feed Cache

**File:** `src/services/for-you/feed-v2.service.ts`

- Cache key: `for-you:${userId ?? 'anon'}:${limit}`
- TTL: 75 seconds
- Cached only when `sessionCreatorIds.length === 0` (initial load).
- Bypassed when `debug=true`.
- On cache hit: returns cached `videoIds` immediately; route still fetches display payload (1 query).

**Effect:** Cache hit avoids full pipeline (affinity, watched, candidates, fetchCandidateVideos, scoring, reranking).

---

## 4. User Affinity Cache

**File:** `src/services/user-affinity.service.ts`

- Cache key: `affinity:${userId}`
- TTL: 120 seconds
- Serializes `UserAffinity` (Set/Map) to JSON-compatible format for storage.
- On cache hit: skips 3 queries (Like, Follow, UserWatchInteraction).

**Effect:** Saves 3 queries per feed request when cached.

---

## 5. Trending Cache

**File:** `src/services/ranking.service.ts`

- Cache key: `trending:${windowHours}:${limit}`
- TTL: 60 seconds
- On cache hit: returns cached `videoIds` without running groupBy + video fetch.

**Effect:** Repeat trending requests within 60s avoid full trending pipeline.

---

## 6. Cache Infrastructure

**File:** `src/lib/feed-cache.ts`

- In-memory TTL cache with `cacheGet` / `cacheSet`.
- Periodic cleanup of expired entries (every 60s).
- TTL constants: FEED=75s, CANDIDATE_BUCKET=60s, AFFINITY=120s, TRENDING=60s.
- **Production:** Consider Redis for multi-instance deployments.

---

## Query Count Impact

| Scenario | Before | After (cache hit) |
|----------|--------|-------------------|
| For You initial load | 14–18 queries | 14–18 (first request) |
| For You repeat (same user, 75s) | 14–18 | 1 (display fetch only) |
| For You (candidate buckets cached) | 8–10 candidate queries | 2–4 (personalized + exploration) |
| For You (affinity cached) | 3 affinity queries | 0 |
| Trending repeat (60s) | 5+ queries | 0 |

---

## 7. Trending Candidate Refactor (No Full Catalog Fetch)

**File:** `src/services/ranking.service.ts`

**Before:** Fetched ALL videos (`Video.findMany` with no limit), then scored in memory.

**After:**
1. Run 4 `groupBy` queries only (Like, Comment, GiftTransaction, CoinTransaction) — uses indexed `createdAt`.
2. Union videoIds with engagement, compute velocity-only score, sort, take top 500.
3. Fetch only those 500 videos: `Video.findMany({ where: { id: { in: topCandidateIds }, status, ... }, take: 500 })`.
4. Full score with completion, return top limit.

**Constant:** `TRENDING_CANDIDATE_CAP = 500` in `src/constants/ranking.ts`.

**Rows fetched:** Max 500 (was: entire catalog).

---

## Not Changed

- **Ranking behavior:** Unchanged. Same scoring formula; only candidate selection is capped.
- **N+1 patterns:** None identified in For You pipeline; no changes.
