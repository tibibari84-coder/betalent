# BeTalent "For You" Feed Algorithm

Goal: recommend the **best performances** for each user by combining engagement, creator tier, diversity, and trend signals.

---

## 1. Signal taxonomy

### Primary signals (highest weight)

| Signal | Description | Source / proxy |
|--------|-------------|----------------|
| **watch_time** | Time spent watching | When available: `Video.totalWatchTimeSec` or view events. Today: proxy from `viewsCount * durationSec` or omitted (neutral). |
| **completion_rate** | % of video watched | When available: view events. Today: proxy from engagement ratio or omitted (neutral). |
| **votes** | Leaderboard / super-vote score | `Video.score` (normalized). |
| **engagement_ratio** | (likes + comments) / views | `(likesCount + commentsCount) / max(viewsCount, 1)`. |

### Secondary signals

| Signal | Description | Source |
|--------|-------------|--------|
| **likes** | Like count | `Video.likesCount` |
| **shares** | Share count | `Video.sharesCount` |
| **comments** | Comment count | `Video.commentsCount` |
| **profile_visits** | Creator profile hits | When available: analytics. Today: omitted. |

### Tertiary signals

| Signal | Description | Source |
|--------|-------------|--------|
| **creator_rank** | Talent tier | `User.creatorTier` (ordinal: STARTER=0 … GLOBAL=4). |
| **challenge_participation** | In active challenge | When available: challenge membership. Today: optional from metadata. |
| **recency** | Time since publish | `Video.createdAt` (newer = boost). |

---

## 2. Signal weighting

Weights are applied after normalizing each signal to a 0–1 scale (e.g. min-max or log over candidate set).

| Tier | Weight | Signals |
|------|--------|--------|
| **Primary** | 0.50 | watch_time, completion_rate, votes, engagement_ratio (equal sub-weights or custom). |
| **Secondary** | 0.30 | likes, shares, comments (profile_visits when available). |
| **Tertiary** | 0.20 | creator_rank, challenge_participation, recency. |

Exact weights are in `src/constants/feed-algorithm.ts`. When watch_time or completion_rate are missing, their share is redistributed to engagement_ratio and votes.

---

## 3. Feed balancing (tier mix)

To keep discovery fair and surface new creators:

| Creator tier | Target share |
|--------------|-------------|
| Rising Talent | 40% |
| Featured Talent | 25% |
| Starter Talent | 20% |
| Spotlight Talent | 10% |
| Global Talent | 5% |

Implementation: build a **ranked candidate pool** per tier (by score), then **fill the feed in order** by allocating slots according to these percentages (e.g. 40% of `limit` from top Rising, 25% from top Featured, etc.). Remaining slots can go to the highest-scoring leftovers.

---

## 4. Diversity rule

- **Max 3 videos per creator per session.**
- When building the final ordered list, after scoring and tier balancing, cap each creator at 3 appearances: keep only the first 3 videos per creator in the combined list, then re-fill any freed slots from the next best candidates (respecting tier mix where possible).

---

## 5. Trend boost

Videos that gain **rapid engagement** get a temporary boost:

- **Definition of “trending”:** High engagement velocity (e.g. likes + comments + votes in last 24–48h). When time-bucketed data exists, use recent delta. Today: **proxy** = high `engagement_ratio` and recent `createdAt` (e.g. &lt; 7 days).
- **Boost:** Multiply raw score by a factor (e.g. 1.0–1.3) for videos that meet the trend condition.
- **Temporary:** In a full implementation, trend window (e.g. 24h) makes the boost decay over time.

---

## 6. Output

- **Return:** Ranked list of **video IDs** (or full feed items) for the For You feed.
- **Inputs:** `userId` (optional, for future personalization), `sessionCreatorIds` (set of creator IDs already shown this session, for diversity), `limit` (e.g. 20–50).
- **Determinism:** For same inputs and same DB state, output order is deterministic. Optional: add small randomness for exploration (e.g. swap within tier bucket).

---

## 7. Code locations

- **Weights, tier mix, diversity cap, trend params:** `src/constants/feed-algorithm.ts`
- **Scoring, balancing, diversity, trend boost:** `src/services/for-you-feed.service.ts`
- **API:** `GET /api/feed/for-you` (optional: `limit`, `cursor`; session state for diversity can be client-supplied or server session).

---

## 8. Future extensions

- **Watch time / completion:** Ingest view events (e.g. `VideoView` with `watchTimeSec`), store aggregates on `Video` or in an analytics store, and plug into primary signals.
- **Viewer interest profile:** Use past likes, completion, and category affinity to weight categories and creators.
- **Challenge participation:** Join with challenge membership so “in challenge” is a tertiary signal and challenge feeds stay aligned with For You.
