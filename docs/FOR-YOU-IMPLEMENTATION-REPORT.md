# BeTalent For You Feed — Production Implementation Report

*Retention-first short-video recommendation system. Not "sort by views".*

**Views are fallback only.** Retention, replay, skip suppression, support quality, and exploration dominate. Raw views never drive ranking.

---

## 1. Candidate Buckets

| Bucket | Source | Cap | Purpose |
|--------|--------|-----|---------|
| **retention** | VideoWatchStats (completedViewsCount, totalWatchSeconds desc) | 300 | High completion / replay / watch quality |
| **support** | Video (coinsCount desc) | 400 | Strong gifts / support videos |
| **engagement** | Video (commentsCount, sharesCount, likesCount desc) | 400 | Comments, shares, strong interaction |
| **fresh** | Video (createdAt desc) | 400 | New uploads for testing |
| **challenge** | ChallengeEntry (active challenges) | 200 | Active challenge entries |
| **rising** | Video (new creators ≤3 uploads) | 300 | Creators with upward momentum |
| **personalized** | By category + creator affinity | 200+150 | User preferred categories/creators |
| **exploration** | Adjacent categories (not preferred) | 150 | Outside normal taste |
| **fallback** | — | — | Videos not in other buckets |

All buckets are cached 60s (`CACHE_TTL.CANDIDATE_BUCKET`). Union deduped, max 1500 candidate IDs. Lightweight filter reduces to 400 before full scoring.

---

## 2. Final Scoring Formula

```
finalScore =
  retentionScore * 0.28 +
  supportScore * 0.25 +
  engagementScore * 0.15 +
  personalizationScore * 0.12 +
  freshnessScore * 0.08 +
  challengeScore * 0.06 +
  creatorQualityScore * 0.04 +
  talentScore * 0.02 -
  safetyPenalty * 0.15
```

Then multiplied by:
- `newUploadBoost` (1.25 for videos &lt;24h)
- `creatorBoost` (1.2 for new creators ≤3 uploads)
- `earlyDistributionMultiplier` (seeding/boosted/suppressed)
- `FOR_YOU_WATCHED_MULTIPLIER` (0.5) if user already watched
- `rankingBoostMultiplier` if admin-set

---

## 3. Retention Formula

When real watch data exists (VideoWatchStats.viewCount ≥ 3):

```
completionRate = completedViewsCount / max(1, viewCount)
avgWatchSecPerView = totalWatchSeconds / max(1, viewCount)
watchTimeQuality = clamp(avgWatchSecPerView / max(10, durationSec), 0, 1)
replayBoost = replayCount > 0 ? min(0.2, replayCount * 0.03) : 0
skipPenalty = skipCount > 0 ? min(0.25, skipCount * 0.03) : 0

retentionScore = clamp(
  completionRate * 0.70 +
  watchTimeQuality * 0.15 +
  replayBoost -
  skipPenalty,
  0, 1
)
```

When watch data is missing: engagement proxy (likes+comments)/views * 0.2. Views are fallback only, never primary.

---

## 4. Half-Life Decay

```
freshnessMultiplier = 0.5 ^ (ageHours / 24)
```

- Default half-life = 24 hours
- High retention/support/engagement can counteract decay via `FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS`
- Floor: 0.1 (prevents total collapse)
- Tunable: `FOR_YOU_HALFLIFE_HOURS` in `src/constants/ranking.ts`

---

## 5. Exploration Rule (Anti-Bubble)

- **80%** personalized (relevance, user interests)
- **20%** exploration (discovery)

Exploration mix:
- 30% rising (new creators)
- 30% fresh (recent uploads)
- 25% challenge
- 15% other (outside user taste)
- Plus random share (30% of exploration) for true discovery

Constants: `FOR_YOU_PERSONALIZED_SHARE`, `FOR_YOU_EXPLORATION_SHARE`, `FOR_YOU_EXPLORATION_MIX`, `FOR_YOU_EXPLORATION_RANDOM_SHARE`.

---

## 6. Reranking Rules

- Max 2 videos per creator (`FEED_MAX_VIDEOS_PER_CREATOR`)
- Max 40% from same challenge (`FOR_YOU_MAX_CHALLENGE_SHARE`)
- Prefer different creator when adding next (avoid same creator in a row)
- Prefer different category when adding next (max 2 same category in a row)
- Session repetition penalty: `finalScore *= max(0.5, 1 - sessionRepetition * 0.2)`
- Recently watched: `finalScore *= 0.5`

---

## 7. Performance Safety

| Measure | Implementation |
|---------|----------------|
| No fetch-all | All bucket queries use `take` (300–400) |
| Capped candidates | Union deduped, slice to 1500 |
| Lightweight filter | Top 400 by lightweight score before full scoring |
| Bucket caching | 60s TTL per bucket |
| Feed cache | 75s TTL per user when session empty |
| No DB in loop | Features extracted once; scoring is in-memory |
| Pre-aggregated | VideoWatchStats, Video.coinsCount, etc. |

---

## 8. Code Changes

| File | Changes |
|------|---------|
| `src/constants/ranking.ts` | Added `FOR_YOU_RETENTION_WEIGHTS`, `FOR_YOU_FINAL_WEIGHTS` |
| `src/services/for-you/features.service.ts` | Added `watchTimeQuality`, `replayBoost`, `retentionSkipPenalty`; `durationSec` in CandidateVideo |
| `src/services/for-you/scoring.service.ts` | Retention formula per spec; weights from `FOR_YOU_FINAL_WEIGHTS` |
| `src/services/for-you/candidates.service.ts` | Bucket names: retention, support, engagement, fresh, challenge, rising, personalized, exploration |
| `src/services/for-you/feed-v2.service.ts` | Added `durationSec` to video fetch |

---

## 9. Explainability & Admin Debug

**Design principle:** The system is not a black box. All scoring components are exposed for inspection.

| Surface | Purpose |
|---------|---------|
| `/admin/feed-debug` | Admin panel: per-video rank, bucket, score breakdown, retention sub-components |
| `GET /api/admin/feed/for-you-debug?limit=30` | Admin API: full `scoreBreakdown` + `explanation` per video |
| `GET /api/debug/ranking/video/[videoId]` | Single-video signals for validation |
| `?debug=1` on feed API | Dev: attach `debug.scored` with breakdown |

**Score breakdown fields:** `retentionScore`, `engagementScore`, `supportScore`, `finalScore`, `rank`, `bucket`, `replayCount`, `skipCount`, `completionRate`, `watchTimeQuality`, `replayBoost`, `retentionSkipPenalty`, `earlyDistPhase`, `earlyDistMultiplier`

**Explanation object:** `completionRate`, `watchTimeQuality`, `replayBoost`, `retentionSkipPenalty`, `decayMultiplier`, `newUploadBoost`, `creatorBoost`, etc. — all components visible.

**Weights:** Centralized in `src/constants/ranking.ts` (`FOR_YOU_FINAL_WEIGHTS`, `FOR_YOU_RETENTION_WEIGHTS`). No magic numbers in scoring loop.
