# For You V2 — Ranking System Implementation

*TikTok-level multi-stage ranking architecture. ML-style design, hand-tuned weights, production-ready.*

---

## 1. Architecture Changes

The For You feed was refactored from a single weighted scoring engine into a **multi-stage pipeline**:

| Stage | Name | Location | Purpose |
|-------|------|----------|---------|
| A | Candidate Generation | `for-you/candidates.service.ts` | Explicit buckets, union, dedupe |
| B | Feature Extraction | `for-you/features.service.ts` | Structured features for ranking |
| C | Primary Scoring | `for-you/scoring.service.ts` | ML-style weighted ranker |
| D | Reranking / Feed Shaping | `for-you/feed-v2.service.ts` | 80/20 split, diversity rules |
| E | Final Assembly | `for-you/feed-v2.service.ts` | Creator cooldown, category balancing |

The main entry point `getForYouFeedRanked` in `ranking.service.ts` now delegates to `getForYouFeedV2`. The API route `/api/feed/for-you` is unchanged.

---

## 2. Candidate Buckets

| Bucket | Source | Purpose |
|--------|--------|---------|
| **personalized** | Preferred categories, preferred creators | User taste match |
| **global_quality** | Retention (completion), support (coins), engagement (comments/shares/likes) | Strong retention, high support, strong creator quality |
| **rising** | New creators (≤3 videos) ordered by recency | New creators with unusual positive watch behavior |
| **challenge** | Active weekly challenge entries (OPEN/VOTING) | Submissions tied to active challenge |
| **exploration** | Non-preferred categories with good support | Adjacent categories, underexposed content |
| **fallback** | Fresh uploads (by createdAt) | Trending/high completion for cold start |

Each bucket is explicit. Candidates are unioned and deduplicated. Recently watched (24h) are excluded.

---

## 3. Features Used

### A. Retention
- `completionRate` — completed views / total views
- `averageWatchSecondsPerView` — normalized to 60s
- `replayRate`, `skipRate`
- `completedViewsCount`, `totalWatchSeconds`

### B. Engagement
- `likeRate`, `commentRate`, `shareRate` — normalized vs max in pool

### C. Support
- `giftCoinsPerView` — coins per view, normalized
- `voteRate` — votes per view, normalized

### D. Talent / Creator
- `talentScore` — 0–10 normalized to 0–1
- `creatorQualityScore` — completion + engagement proxy; new creators get 0.7

### E. Context
- `ageHours` — video age
- `challengeRelevance` — 1 if in active challenge, else 0
- `categoryMatch`, `styleMatch`, `contentTypeAffinity` — from user affinity

### F. Safety
- `moderationPenalty` — 1 if reportCount > 0 or isFlagged
- `reportRate` — reportCount / 5, capped at 1

---

## 4. Primary Scoring Logic

ML-style weighted formula:

```
baseScore =
  retentionQuality * W_retention +
  engagementQuality * W_engagement +
  supportQuality * W_support +
  personalizationAffinity * W_affinity +
  freshnessAdjusted * W_freshness +
  creatorQuality * W_creator +
  challengeRelevance * W_challenge -
  safetyPenalty * W_safety
```

**V2 weights** (`V2_SCORING_WEIGHTS`):
- retentionQuality: 0.28
- engagementQuality: 0.22
- supportQuality: 0.20
- personalizationAffinity: 0.12
- freshnessAdjusted: 0.08
- creatorQuality: 0.06
- challengeRelevance: 0.06
- safetyPenalty: 0.15 (subtracted)

**Multipliers:**
- `newUploadBoost` — 1.25 for videos < 24h old
- `creatorBoost` — 1.2 for new creators (≤3 videos)
- `decayMultiplier` — half-life decay (see below)

---

## 5. Half-Life Decay

- **Default half-life:** 24 hours
- **Formula:** `decay = 0.5^(ageHours / 24)`
- **Counterbalance:** Strong retention, support, engagement reduce decay:
  - `counterbalance = 0.4*retention + 0.35*support + 0.25*engagement`
  - `effective = decay + (1 - decay) * counterbalance`
- **Floor:** 0.1 — prevents total collapse for old content
- **Constants:** `FOR_YOU_HALFLIFE_HOURS`, `FRESHNESS_FLOOR` in scoring.service

---

## 5b. User Taste Vector (Time-Decayed)

User affinity is computed with time-decay: **recent behavior > old behavior**.

| Signal | Source | Decay |
|--------|--------|-------|
| **Category affinity** | Likes, high-completion watches (≥70%) | `2^(-ageHours/168)` |
| **Creator affinity** | Follows, likes, high-completion watches | Same |
| **Skip patterns** | Fast skips (<20%) → negative category scores | Same |
| **Watch behavior** | avgCompletionTendency, rewatchRate, highCompletionRatio | Same |

- **Half-life:** 168 hours (7 days)
- **personalizationAffinity** in scoring: categoryMatch 35%, creatorMatch 30%, styleMatch 25%, contentType 10%
- Skip categories reduce categoryMatch (categoryAffinity − negativeCategoryScores)

---

## 6. 80/20 Exploration

- **80% personalized** — relevance, user interests
  - 65% ranking-ordered (score)
  - 35% style/category match
- **20% exploration** — discovery
  - 30% rising (new creators)
  - 30% fresh (recent uploads)
  - 25% challenge
  - 15% other (non-style-match)

Exploration is deliberate feed shaping, not accidental randomness. Constants: `FOR_YOU_PERSONALIZED_SHARE`, `FOR_YOU_EXPLORATION_SHARE`, `FOR_YOU_PERSONALIZED_MIX`, `FOR_YOU_EXPLORATION_MIX`.

---

## 7. Reranking / Repetition Prevention

- **Creator cooldown:** Max 2 videos per creator in feed (`FEED_MAX_VIDEOS_PER_CREATOR`)
- **No back-to-back same creator:** Prefer different creator when selecting next
- **Category balancing:** Prefer different category when selecting next
- **Challenge cap:** Max 40% of feed from same challenge (`FOR_YOU_MAX_CHALLENGE_SHARE`)
- **Recently-seen suppression:** Videos watched in last 24h excluded from candidates
- **Repeat penalty:** Already-watched videos get 0.5× score
- **Skip penalty:** Negative category (fast skips) gets 0.7× score

---

## 8. New Creators / New Videos

- **New creator boost:** Creators with ≤3 videos get 1.2× discovery boost
- **New upload boost:** Videos < 24h old get 1.25× boost
- **Early test phase:** Videos < 48h are in "limited discovery" window; scoring uses retention/skip signals — strong retention boosts, bad skip rate suppresses
- **Rising bucket:** Explicit bucket for new creators; gets 30% of exploration slots

### Early Distribution (Breakout Discovery)

New uploads get initial exposure (50–200 watch samples), then boost or suppress based on retention:

| Phase | Condition | Multiplier |
|-------|-----------|------------|
| **seeding** | viewCount < 50 | 1.15× (ensure initial exposure) |
| **boosted** | viewCount ≥ 50, completionRate ≥ 0.5, skipRate ≤ 0.3 | 1.5× (larger audience) |
| **suppressed** | viewCount ≥ 50, completionRate < 0.3 OR skipRate ≥ 0.5 | 0.2× (suppress quickly) |
| **testing** | viewCount ≥ 50, neither strong nor weak | 1.0× |
| **graduated** | age > 48h or viewCount ≥ 200 | 1.0× (normal ranking) |

Signals: completionRate, skipRate, replay from VideoWatchStats.

---

## 9. Cold Start

- **New user:** `userId` null → empty affinity. Fallback + global_quality + challenge + rising buckets dominate. Personalized slots filled from ranking-ordered (quality-based).
- **New content:** Small exploration pool via rising + fresh buckets; early test phase gives limited exposure; strong retention boosts further.

---

## 10. Trending vs For You

- **Trending:** Velocity-based (per-hour rates), momentum, broad interest. Unchanged in `getTrendingRanked`.
- **For You:** Personalized + retention-driven + shaped. Uses V2 pipeline.
- **No collapse:** Separate ranking logic; Trending and For You remain distinct.

---

## 11. Debug / Explainability

- **`params.debug`** on `getForYouFeedV2` returns `{ scored: ScoredCandidate[] }` with per-item `explanation`.
- **`computePrimaryScore(..., debug: true)`** returns `ScoreExplanation`:
  - baseScore, retentionQuality, engagementQuality, supportQuality
  - personalizationAffinity, freshnessAdjusted, creatorQuality, challengeRelevance
  - safetyPenalty, decayMultiplier, newUploadBoost, creatorBoost, earlyTestPhase

Dev-only or logs; not exposed in public API by default.

---

## 12. ML-Ready Design

- **Feature extraction** — separated in `features.service.ts`; all features explicit
- **Score components** — explicit in `scoring.service.ts`; weights in `V2_SCORING_WEIGHTS`
- **Candidate generation** — modular buckets in `candidates.service.ts`
- **Reranking logic** — explicit in `feed-v2.service.ts`
- **Logging** — `explanation` object available when `debug=true`

Weights are hand-tuned today; architecture supports future learned models (e.g. replace `computePrimaryScore` with a model inference).

---

## 13. Future Work

| Item | Status |
|------|--------|
| Learned model for weights | Hand-tuned; replace scoring layer when ready |
| Online model serving | Not introduced |
| Feature store | Not introduced |
| Profile click rate, follow conversion | Schema lacks; use proxies or add tracking |
| Country/language affinity | Soft only; schema has creator country |
| A/B testing framework | Not implemented |
| Score logging to analytics | Not implemented |

---

## File Map

| File | Purpose |
|------|---------|
| `src/services/for-you/candidates.service.ts` | Candidate buckets |
| `src/services/for-you/features.service.ts` | Feature extraction |
| `src/services/for-you/scoring.service.ts` | Primary scoring, half-life, boosts |
| `src/services/for-you/feed-v2.service.ts` | Orchestrator, reranking, assembly |
| `src/services/for-you/early-distribution.service.ts` | Early distribution (boost/suppress) |
| `src/services/for-you/index.ts` | Exports |
| `src/services/ranking.service.ts` | Delegates For You to V2; Trending unchanged |

---

*Implementation date: March 2026.*
