# BeTalent For You Performance Audit

*Senior performance audit. Target: avoid 1–2 second latency on every feed request. Inspected actual codebase, query patterns, and Prisma usage.*

---

## A. Current Request Flow

### One For You Request: Step-by-Step

```
GET /api/feed/for-you?limit=30
```

**1. Auth** — `getCurrentUser()` — 1 query (session lookup)

**2. Parallel upstream (Promise.all)** — 3 queries:
- `getUserAffinity(userId)` → Like.findMany (userId, take 300, orderBy createdAt desc) + Follow.findMany (followerId, take 300) + UserWatchInteraction.findMany (userId, take 300, orderBy lastWatchedAt desc)
- `getWatchedVideoIds(userId)` → UserWatchInteraction.findMany (userId, take 500, orderBy lastWatchedAt desc)
- `getRecentlyWatchedVideoIds(userId)` → UserWatchInteraction.findMany (userId, lastWatchedAt >= since)

**3. Candidate generation** — `generateCandidates()` — 8–10 queries:

| # | Query | Table(s) | Take | Notes |
|---|-------|----------|------|-------|
| 1 | Retention | VideoWatchStats | 300 | WHERE viewCount≥3, ORDER BY completedViewsCount DESC, totalWatchSeconds DESC |
| 2 | Support | Video | 400 | baseWhere, ORDER BY coinsCount DESC |
| 3 | Engagement | Video | 400 | baseWhere, ORDER BY commentsCount, sharesCount, likesCount DESC |
| 4 | Fresh | Video | 400 | baseWhere, ORDER BY createdAt DESC |
| 5 | Challenge | ChallengeEntry | 200 | video: baseWhere, challenge: status IN, startAt≤now, endAt≥now |
| 6 | Rising | Video | 300 | baseWhere, ORDER BY createdAt, includes creator._count.videos |
| 7 | Category | Video | 200 | if preferredCategoryIds; categoryId IN, ORDER BY likesCount |
| 8 | Creator | Video | 150 | if preferredCreatorIds; creatorId IN, ORDER BY createdAt |
| 9 | Exploration | Category | 20 | if preferredCategoryIds; id NOT IN preferred |
| 10 | Exploration | Video | 150 | categoryId IN explorationIds, ORDER BY coinsCount |

Queries 1–8 run in `Promise.all`. Queries 9–10 run sequentially when `preferredCategoryIds.size > 0`.

**4. Dedupe & cap** — Union of IDs, dedupe, slice to 1500

**5. fetchCandidateVideos** — 1 query:
- Video.findMany where id IN (up to 1500 ids), include creator._count.videos, watchStats, challengeEntries.challenge

**6. Scoring loop** — In-memory over all candidates (up to ~1500):
- extractFeatures (pure compute from Video + watchStats)
- computePrimaryScore (pure compute)
- getEarlyDistributionStatus (pure compute)
- diversity/reranking multipliers

**7. Reranking** — In-memory:
- Build 6 ordered lists: rankingOrdered, styleMatchOrdered, risingOrdered, freshOrdered, challengeOrdered, otherOrdered
- Round-robin fill personalized slots (80%), then exploration slots (20%)
- Diversity rules: max 2 per creator, max challenge share, prefer different creator/category

**8. Route display fetch** — 1 query:
- Video.findMany where id IN (top N), include creator for display

### Query Count Summary

| Phase | Queries | Notes |
|-------|---------|-------|
| Auth | 1 | Session |
| Affinity + watched | 3–5 | 3 affinity + 2 watch (or 0 if anon) |
| Candidates | 8–10 | 8 parallel + 0–2 exploration |
| fetchCandidateVideos | 1 | Up to 1500 ids |
| Display | 1 | Top N ids |
| **Total** | **14–18** | Per request, no cache |

### Candidate Buckets

| Bucket | Source | Max IDs |
|--------|--------|---------|
| global_quality | retention, support, engagement | 300+400+400 |
| fallback | fresh | 400 |
| challenge | ChallengeEntry | 200 |
| rising | Video with creator count ≤3 | subset of 300 |
| personalized | category, creator | 200+150 |
| exploration | non-preferred categories | 150 |

Union size before dedupe: ~2350. After dedupe + slice: up to 1500.

### Scoring

- **In-memory** after fetching. No DB in loop.
- **Feature extraction** uses Video columns + watchStats (already in fetchCandidateVideos).
- **VideoRankingStats** exists in schema but **is not used** by For You V2.

---

## B. Current Performance Risks

| Risk | Severity | Cause |
|------|----------|-------|
| **VideoWatchStats full scan + sort** | **Critical** | Retention query: WHERE viewCount≥3, ORDER BY completedViewsCount DESC, totalWatchSeconds DESC. Only index is `[videoId]`. No index supports filter+sort. |
| **14–18 DB round-trips per request** | **High** | No caching. Every scroll hits full pipeline. |
| **Trending fetches ALL videos** | **High** | `prisma.video.findMany` with no `take`. Loads entire catalog into memory. |
| **User affinity 3 queries** | **Medium** | Like, Follow, UserWatchInteraction each fetch up to 300 rows with joins. No cache. |
| **getRecentlyWatchedVideoIds** | **Medium** | `WHERE userId AND lastWatchedAt >= since`. No composite index (userId, lastWatchedAt). |
| **Like orderBy createdAt** | **Medium** | Affinity: `where userId, orderBy createdAt desc`. No (userId, createdAt) index. |
| **Trending groupBy** | **Medium** | Like/Comment/GiftTransaction groupBy by videoId where createdAt≥since. Like has no createdAt index. |
| **Rising creator join** | **Low** | 300 videos with creator._count.videos. Prisma batches; acceptable. |
| **ChallengeEntry join** | **Low** | Video + Challenge join. ChallengeEntry has challengeId index. |

---

## C. What Is Already Optimized

| Item | Status |
|------|--------|
| Parallel candidate queries | ✅ 8 buckets in Promise.all |
| Single fetchCandidateVideos | ✅ One query with includes, no N+1 |
| Scoring in-memory | ✅ No DB in scoring loop |
| Feature extraction | ✅ Uses data from single fetch, no extra queries |
| Video `status, coinsCount` | ✅ Composite index for support bucket |
| Video `createdAt` | ✅ Index for fresh bucket |
| Video `categoryId`, `creatorId` | ✅ Indexes for personalized buckets |
| UserWatchInteraction `userId` | ✅ Index for watched/recent |
| Follow `followerId` | ✅ Index for affinity |
| Comment `createdAt` | ✅ Index for trending groupBy |
| GiftTransaction `createdAt` | ✅ Index for trending |
| CoinTransaction `createdAt` | ✅ Index for trending |
| ChallengeEntry `challengeId` | ✅ Index for challenge bucket |

---

## D. Missing Indexes (Exact Prisma Definitions)

### VideoWatchStats

**Current:** `@@index([videoId])` only.

**Missing:** Index for retention bucket: `WHERE viewCount >= 3 ORDER BY completedViewsCount DESC, totalWatchSeconds DESC`.

Prisma does not support partial indexes. Add:

```prisma
model VideoWatchStats {
  // ... existing fields ...
  @@index([videoId])
  @@index([viewCount, completedViewsCount(sort: Desc), totalWatchSeconds(sort: Desc)])
}
```

For PostgreSQL, a partial index is better (avoids indexing low-viewCount rows):

```sql
-- Raw migration (run after prisma migrate):
CREATE INDEX "VideoWatchStats_retention_idx" ON "VideoWatchStats" ("completedViewsCount" DESC, "totalWatchSeconds" DESC) WHERE "viewCount" >= 3;
```

### UserWatchInteraction

**Current:** `@@unique([userId, videoId])`, `@@index([userId])`, `@@index([videoId])`, `@@index([lastWatchedAt])`.

**Missing:** Composite for `getRecentlyWatchedVideoIds`: `WHERE userId = ? AND lastWatchedAt >= ?`.

```prisma
@@index([userId, lastWatchedAt])
```

### Like

**Current:** `@@unique([userId, videoId])`, `@@index([videoId])`. No `userId` index (unique covers it). No `createdAt` index.

**Missing:** For affinity `where userId, orderBy createdAt desc` and trending `groupBy videoId where createdAt >= since`:

```prisma
@@index([userId, createdAt(sort: Desc)])
@@index([createdAt])
```

### GiftTransaction

**Current:** `@@index([videoId])`, `@@index([createdAt])`.

**Missing:** Composite for trending `groupBy videoId where createdAt >= since`:

```prisma
@@index([videoId, createdAt])
```

### ChallengeEntry

**Current:** `@@index([challengeId])`, `@@index([creatorId])`.

**Missing:** For challenge bucket join (lookup by video relation):

```prisma
@@index([videoId])
```

### Challenge

**Current:** `@@index([status])`, `@@index([startAt])`, `@@index([endAt])`.

**Optional:** Composite for active challenge filter `status IN (...) AND startAt <= now AND endAt >= now`:

```prisma
@@index([status, startAt, endAt])
```

### Video (engagement bucket)

**Current:** `@@index([status, coinsCount])` for support. No composite for engagement sort.

**Optional:** For `ORDER BY commentsCount DESC, sharesCount DESC, likesCount DESC`:

```prisma
@@index([status, processingStatus, moderationStatus, commentsCount(sort: Desc)])
```

Lower priority; planner may use status filter + sort.

---

## E. What Should Be Cached

| Cache | Key | TTL | Scope | Invalidation |
|-------|-----|-----|-------|--------------|
| **For You feed** | `for-you:${userId}:${limit}:${page}` or `for-you:anon:${sessionHash}` | 60–90 s | Per-user | Time-based |
| **User affinity** | `affinity:${userId}` | 120 s | Per-user | On like/follow/watch (or accept staleness) |
| **Watched IDs** | `watched:${userId}` | 60 s | Per-user | On watch |
| **Recently watched** | `recent:${userId}` | 30 s | Per-user | On watch |
| **Candidate buckets (global)** | `candidates:retention`, `candidates:support`, `candidates:engagement`, `candidates:fresh` | 60 s | Global | Time-based |
| **Challenge bucket** | `candidates:challenge:${activeChallengeIds}` | 60 s | Global | On challenge status change |
| **Rising bucket** | `candidates:rising` | 60 s | Global | Time-based |
| **Trending** | `trending:${windowHours}` | 60–120 s | Global | Time-based |

**Implementation:** In-memory (e.g. `node-cache`) or Redis. Check cache before running pipeline. Store `videoIds` for feed; final display fetch still by id (cheap).

**Priority:** Feed cache > affinity cache > candidate bucket cache > trending cache.

---

## F. What Should Be Precomputed

| Object | Fields | Refresh | Mechanism | Solves |
|--------|--------|---------|-----------|--------|
| **Retention top-N** | videoId, completedViewsCount, totalWatchSeconds | 1–2 min | Cron: query VideoWatchStats, store top 500 ids in cache | Avoids retention query on every request |
| **Support top-N** | videoIds by coinsCount | 1–2 min | Cron or cache from Video | Reduces support query |
| **Engagement top-N** | videoIds by engagement | 1–2 min | Cron or cache | Reduces engagement query |
| **Active challenge IDs** | challengeIds where OPEN/VOTING, now between start/end | 1 min | Cron or on challenge update | Speeds challenge bucket |
| **VideoRankingStats** | rankingScore, watchTimeScore, etc. | On event or cron | Already exists; `updateAllRankingStats` | For You V2 does not use it; either wire in or remove |
| **User preference summary** | preferredCategoryIds, preferredCreatorIds (lightweight) | On like/follow/watch | Inline update to cache | Reduces affinity query cost |

**VideoRankingStats:** Currently populated by `upsertVideoRankingStats` and `updateAllRankingStats`. For You V2 ignores it and recomputes from Video + VideoWatchStats. Either:
- Use VideoRankingStats for candidate ordering (e.g. support/engagement), or
- Remove it to avoid confusion.

---

## G. Highest-Priority Fixes Before Public Launch

### P0 — Must Fix

1. **Add VideoWatchStats retention index** — Prevents full scan + sort on hot path. Use partial index if possible.
2. **Add UserWatchInteraction (userId, lastWatchedAt)** — Speeds `getRecentlyWatchedVideoIds`.
3. **Add feed cache (60–90s)** — Largest latency win. Repeat requests return from cache.
4. **Add user affinity cache (120s)** — Saves 3 queries per request.

### P1 — Should Fix

5. **Fix Trending** — Add `take` or pre-rank; do not fetch all videos.
6. **Add Like (createdAt) and (userId, createdAt)** — For affinity and trending.
7. **Add GiftTransaction (videoId, createdAt)** — For trending groupBy.
8. **Cache candidate buckets** — retention, support, engagement, fresh, challenge, rising. 60s TTL.

### P2 — Nice to Have

9. **Add ChallengeEntry (videoId)** — For challenge bucket join.
10. **Precompute global candidate IDs** — Cron every 1–2 min → cache.
11. **Wire VideoRankingStats into V2 or remove** — Avoid dead code.

---

## API Latency Target

**Target:** <500 ms server time; avoid 1–2 s on normal feed requests.

**Current risks:**
- 14–18 DB round-trips with no cache → 200–800 ms+ depending on DB and network.
- VideoWatchStats full scan → 50–200 ms+ with 10k+ rows.
- Trending fetches all videos → Unbounded; will not scale.

**Fastest wins:**
1. Feed cache (60–90s) → Cache hit: ~1–2 queries (display fetch), ~50–100 ms.
2. VideoWatchStats index → Cuts retention query from full scan to index scan.
3. Affinity cache → Saves 3 queries, ~50–150 ms.
4. Candidate bucket cache → Saves 8+ queries for shared buckets.

**With P0 fixes:** Cache hit ~100–200 ms; cache miss ~400–600 ms (with indexes). Acceptable for launch.
