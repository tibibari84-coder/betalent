# BeTalent For You Recommendation System

**Production-grade design and implementation audit.**  
**Date:** March 2026

---

## Half-Life Decay & Exploration

See `docs/FOR-YOU-DECAY-AND-EXPLORATION.md` for full details.

- **Half-life**: Every 24h, freshness halves; retention + support + engagement counterbalance
- **80/20 split**: 80% personalized, 20% exploration (rising, fresh, challenge, other)

---

## Architecture: Ranking vs Recommendation vs Feed Shaping

| Concept | What It Is | What It Is NOT | Where in Pipeline |
|---------|------------|----------------|--------------------|
| **Ranking** | Ordering items by a score (e.g. sort by engagement) | The full For You system | Used *within* pillars (e.g. rankingOrdered = sort by score) |
| **Recommendation** | Scoring candidates for relevance to this user | A sorted list | Stage 2: per-candidate scoring with retention, affinity, etc. |
| **Feed shaping** | Controlling feed order for diversity, pacing, variety | Sorting by score | Stage 3: pillar allocation, round-robin, creator/challenge caps |

**Critical:** The For You feed output is **NOT** `candidates.sort(byScore).slice(0, limit)`.  
It is: **candidates** → **score each** → **shape into feed** (pillar slots + diversity rules).

### Anti-Vanity: Central Signals

| Weak (avoid) | Central (prioritize) |
|--------------|----------------------|
| Raw viewsCount | Watch retention / completion rate |
| Raw likesCount alone | Support (gifts, votes), comment, share |
| Vanity engagement | Explicit intent, creator diversity |

Candidate sources: retention (VideoWatchStats), support (coins), engagement (comment > share > like), freshness, challenge.  
Weights: retention 0.28, support 0.25, engagement 0.15 (talent/freshness/affinity lower).

### Six Requirements (Verified)

| Requirement | Implementation |
|-------------|----------------|
| **Candidate generation** | Union of 4 sources (engagement, support, freshness, active challenge); pool ~1500; exclude recently watched |
| **Scoring** | Multi-signal: retention, engagement, support, talent, freshness, userAffinity, challenge, creatorQuality; user-specific penalties |
| **Diversity control** | Creator cap (2), challenge cap (40%), no back-to-back same creator; pillar slot allocation |
| **Repeat prevention** | Exclude videos watched in last 24h from candidates; 0.5× multiplier for already-watched |
| **Cold start logic** | No userId → empty affinity, no repeat/skip penalties; same candidate pool; diverse mix from pillars |
| **Challenge-aware discovery** | Active challenge videos in candidate pool; challengeRelevance boost; challenge cap in shaping |

---

## Part 1 — Audit: Current Implementation

### 1. ACTUALLY IMPLEMENTED

| Component | Location | What It Does | Quality |
|-----------|----------|--------------|---------|
| **For You API** | `src/app/api/feed/for-you/route.ts` | Uses `getForYouFeedRanked`, returns ranked videos | Real recommendation |
| **Feed ranking** | `src/services/ranking.service.ts` → `getForYouFeedRanked()` | Multi-pillar scoring, diversity, exploration | Real recommendation |
| **Watch tracking** | `UserWatchInteraction`, `watch-progress.service.ts`, `POST /api/watch-progress` | Records watchTimeSec, completedPct; updates VideoWatchStats | Real retention signal |
| **Watch progress client** | `FeedVideoPlayer.tsx` | Sends progress on scroll-away (isActive→false) | Real |
| **User preference (category)** | `ranking.service.ts` | Preferred categories from likes + high-completion (≥70%); negative from fast skips (<20%) | Partial |
| **Candidate pool** | `ranking.service.ts` | Union: by engagement, by support, by freshness; excludes recently watched | Real |
| **Creator diversity** | `ranking.service.ts` | Max 2 per creator; prefer different creator than last; sessionCreatorIds | Real |
| **Anti-repeat** | `getRecentlyWatchedVideoIds(userId, 24)` | Excludes videos watched in last 24h | Real |
| **Support/gifts** | `getSupportExcludingSelf`, `GIFT_TIER_WEIGHTS` | Self-vote excluded; premium gifts weighted higher | Real |
| **Fraud exclusion** | `getConfirmedFraudSupportSourceIds` | Excludes confirmed-fraud support from ranking | Real |
| **Challenge relevance** | `ranking.service.ts` | Boost for videos in active challenges | Real |
| **New creator boost** | `NEW_CREATOR_DISCOVERY_BOOST` (1.2) | First 3 uploads get discovery boost | Real |
| **Completion boost** | `VideoWatchStats`, `FOR_YOU_HIGH_COMPLETION_BOOST` | Videos with ≥70% completion get boost | Real |
| **Exploration** | `FOR_YOU_EXPLORATION_SHARE` (20%) | Rising, fresh, challenge, other | Real |

### 2. PARTIALLY IMPLEMENTED

| Component | Location | What Exists | What's Missing |
|-----------|----------|-------------|----------------|
| **User affinity** | `ranking.service.ts` | Category only (from likes + completion) | Style, creator, country, content-type preference |
| **ViewRecord** | `prisma/schema.prisma` | viewerKey, videoId, createdAt (throttle only) | startedAt, endedAt, watchedMs, completed, sourceFeed |
| **for-you-feed.service** | `src/services/for-you-feed.service.ts` | Tier-based scoring | **Not used by API** (dead code) |
| **Moderation in feed** | `baseWhere` | moderationStatus: APPROVED | No reportCount/isFlagged penalty |

### 3. MISSING

| Component | Spec Requirement | Status |
|-----------|------------------|--------|
| UserPreference / UserTasteProfile table | Materialized preference summary | Derive on-the-fly for MVP |
| VideoView with full fields | startedAt, endedAt, watchedMs, completed, sourceFeed | UserWatchInteraction covers core; ViewRecord is throttle-only |
| Style preference | performanceStyle affinity | Not implemented |
| Follow-based creator boost | Videos from followed creators | Not in For You (only in Following feed) |
| Profile click tracking | Intent signal | Not implemented |
| Comment open tracking | Curiosity signal | Not implemented |
| Cursor-based pagination | For You API | Uses limit only |
| Precomputed ranking cache | Performance | VideoRankingStats exists; no user-specific cache |

### 4. NEEDS REWORK

| Component | Issue | Action |
|-----------|-------|--------|
| Scoring formula | Scattered; retention not explicit top weight | Centralize weights; retentionScore as W1 |
| Creator quality score | Not explicit | Add from creator-level signals |
| Challenge balancing | No cap on challenge content | Add max % from same challenge |
| Style diversity | No balancing | Add style cooldown in feed shaping |
| Moderation penalty | reportCount/isFlagged not used | Add penalty |

---

## Part 2 — System Philosophy

The BeTalent For You feed ranks by:

- **A. User interest**: watch behavior, likes, follows, preferred categories/styles
- **B. Content quality**: retention, engagement, support, talent score
- **C. Discovery**: freshness, diversity, new creators, challenge relevance

---

## Part 3 — Scoring Model (Production)

```
finalScore =
  retentionScore      * W_retention      +
  engagementScore     * W_engagement     +
  supportScore        * W_support        +
  talentScore         * W_talent         +
  freshnessScore      * W_freshness      +
  userAffinityScore   * W_affinity       +
  challengeBoost      * W_challenge      +
  creatorQualityScore * W_creator        -
  diversityPenalty    * W_diversity      -
  repeatPenalty       * W_repeat         -
  moderationPenalty   * W_moderation
```

Weights (centralized in `src/constants/ranking.ts`):

| Component | Weight | Source |
|-----------|--------|--------|
| retentionScore | 0.25 | VideoWatchStats.completedViewsCount/viewCount; proxy when missing |
| engagementScore | 0.18 | likes, comments, shares (share>comment>like) |
| supportScore | 0.18 | super votes, gift coins (excl. self, fraud) |
| talentScore | 0.12 | talentScore 0–10 normalized |
| freshnessScore | 0.12 | 24h=1, 7d=0.7, decay |
| userAffinityScore | 0.10 | category + style match, follow creator boost |
| challengeBoost | 0.08 | active challenge = 1 |
| creatorQualityScore | 0.05 | creator retention/engagement proxy |
| diversityPenalty | -0.05 | per repeated creator in session |
| repeatPenalty | -0.10 | already watched |
| moderationPenalty | -0.15 | reportCount / isFlagged |

---

## Part 4 — Data Model

### Existing (Used)

- **UserWatchInteraction**: userId, videoId, watchTimeSec, completedPct, isRewatch, lastWatchedAt
- **VideoWatchStats**: videoId, totalWatchSeconds, completedViewsCount, viewCount (populated by recordWatchProgress)
- **ViewRecord**: throttle only (viewerKey, videoId, createdAt)
- **Like, Comment, Follow, Vote, GiftTransaction**: engagement/support

### Optional Future

- **UserPreference**: materialized taste (categories, styles, creators) — derive on-the-fly for MVP
- **VideoView** (full): startedAt, endedAt, watchedMs, completed, sourceFeed — UserWatchInteraction sufficient for MVP

---

## Part 5 — Feed Pipeline

### Stage 1: Candidate Generation

Sources (union, dedupe):

1. High engagement (likes, comments, shares desc) — 600
2. High support (coinsCount desc) — 600
3. Fresh uploads (createdAt desc) — 600
4. Active challenge videos — 200 (added)
5. Exploration pool (random sample) — 100 (added)

Exclude: recently watched (24h), moderation-rejected.

### Stage 2: Scoring

Per-candidate: compute all components, weighted sum. Normalize to [0,1] where applicable.

### Stage 3: Re-ranking / Feed Shaping

- Max 2 videos per creator
- Prefer different creator than last (no back-to-back)
- Max 40% from same challenge (added)
- 15% exploration slots from shuffled unseen
- Pillar mix: ranking 40%, fresh 25%, styleMatch 20%, newCreator 15%

---

## Part 6 — User Affinity (Derived)

From: likes, high-completion watches (≥70%), follows.

- **Preferred categories**: categoryId from liked videos + completed watches
- **Negative categories**: categoryId from fast skips (<20%)
- **Preferred creators**: creatorId from follows + liked videos
- **Preferred styles**: performanceStyle from liked + completed (added)

Decay: recent actions matter more (limit 200 most recent).

---

## Part 7 — Cold Start

**New user (no history):**

- No personalization
- Mix: trending + high completion + active challenge + diverse categories
- Same pillars, no watched/skip penalties

**New video (no history):**

- Exploration boost for new uploads (≤48h)
- New creator boost (≤3 uploads)
- Challenge submission boost

---

## Part 8 — Diversity / Repetition Control

- **Video cooldown**: 24h — exclude from candidates
- **Creator cooldown**: max 2 per feed
- **Back-to-back**: never same creator when avoidable
- **Challenge balancing**: max 40% from same challenge
- **Style balancing**: prefer variety (soft)

---

## Part 9 — Anti-Spam / Quality

- Exclude: moderationStatus !== APPROVED
- Penalty: reportCount > 0 or isFlagged → -0.15
- Self-vote excluded from support
- Confirmed fraud support excluded

---

## Part 10 — API

- `GET /api/feed/for-you?limit=30&creatorIds=id1,id2`
- Auth: optional (personalization when logged in)
- Pagination: limit only (cursor future)
- Performance: candidate pool ~1500; 2–3 DB round-trips

---

## Part 11 — What Was Changed

1. **ranking.service.ts**: Added retentionScore as explicit top weight; creator quality; moderation penalty; style preference; follow creator boost; active challenge candidate source; challenge balancing.
2. **ranking.ts**: New FOR_YOU_WEIGHTS with retention, moderation, explicit components.
3. **user-affinity.service.ts**: New service for derived preferences (categories, styles, creators).
4. **watch-progress.service.ts**: Already updates VideoWatchStats (no change).

---

## Part 12 — Future Work

- Cursor-based pagination
- User-specific feed cache (short TTL)
- Materialized UserPreference table
- Profile click / comment open tracking
- VideoView with full fields (sourceFeed)
- A/B testing framework for weights

---

## Part 14 — Output Report (Implementation Complete)

### What Was Already Present

- For You API (`/api/feed/for-you`) using `getForYouFeedRanked`
- UserWatchInteraction, watch-progress API, FeedVideoPlayer recording
- VideoWatchStats populated by recordWatchProgress
- Multi-pillar candidate pool (engagement, support, freshness)
- Creator diversity (max 2/creator, no back-to-back)
- Recent-watch exclusion (24h)
- Category preference from likes + completion
- Negative categories from fast skips
- Support/gift weighting, fraud exclusion
- Challenge relevance boost
- New creator discovery boost
- Exploration slots (15%)

### What Was Changed

1. **user-affinity.service.ts** (new): Derived preferences (categories, styles, creators) from likes, follows, high-completion watches (≥70%), fast skips (<20%).

2. **ranking.service.ts**:
   - Uses `getUserAffinity()` instead of inline preference loading
   - Added active challenge videos as candidate source

3. **constants/ranking.ts**:
   - Production `FOR_YOU_WEIGHTS`: retentionScore 0.25, engagement 0.18, support 0.18, talent 0.12, freshness 0.12, userAffinity 0.10, challenge 0.08, creatorQuality 0.05; penalties: diversity -0.05, repeat -0.10, moderation -0.15
   - `FOR_YOU_MAX_CHALLENGE_SHARE = 0.4` (max 40% from same challenge)
   - `FOR_YOU_WATCHED_MULTIPLIER = 0.5` (renamed from FOR_YOU_WATCHED_PENALTY)

4. **Scoring formula** (refactored):
   - Explicit retentionScore (VideoWatchStats completion rate)
   - userAffinityScore: category + style + follow creator
   - creatorQualityScore: engagement + completion proxy

5. **Feed shaping**:
   - Challenge balancing: max 40% from same challenge
   - `canAdd()` now checks challenge cap

6. **Moderation penalty**: reportCount > 0 or isFlagged → -0.15

### Exact Scoring Model

```
forYouScore =
  retentionScore      * 0.25 +
  engagementScore     * 0.18 +
  supportScore        * 0.18 +
  talentScore         * 0.12 +
  freshnessScore      * 0.12 +
  userAffinityScore   * 0.10 +
  challengeRelevance  * 0.08 +
  creatorQualityScore * 0.05 +
  diversityPenalty    * (-0.05) +
  repeatPenalty       * (-0.10) +
  moderationPenalty   * (-0.15) +
  completionBoost     +
  highCompletionBoost -
  skipPenalty

finalScore = max(0, forYouScore) * newCreatorBoost * watchedMultiplier
```

### Diversity Enforcement

- **Video cooldown**: 24h — exclude from candidates
- **Creator cap**: max 2 per feed
- **Back-to-back**: never same creator when avoidable
- **Challenge cap**: max 40% from same challenge
- **Exploration**: 15% shuffled unseen

### Cold Start

- No userId → empty affinity; no personalization
- Same pillars; no watched/skip penalties
- Mix: trending + high completion + active challenge + diverse categories

### Challenge Content

- Active challenge videos in candidate pool
- challengeRelevance boost (0.08) when in active challenge
- Max 40% from same challenge in feed shaping

### Time Decay & Freshness

- **New upload boost**: Videos in first 24h get ×1.25 multiplier
- **Time decay**: Score halves every 14 days; high engagement preserves 60%
- **Retention + freshness**: `retentionFreshnessCombined = retention × (0.6 + 0.4 × freshness)`

### User-Category Affinity

- **categoryAffinityScores**: Map of categoryId → strength (0–1) from likes + high-completion watches
- **Boost**: Videos in preferred categories get +0.2 × max(0.5, affinityStrength)
- **Negative**: Categories from fast skips get −0.3 penalty

### Remaining Future Work

- Cursor pagination
- Pass sessionCreatorIds from client on "load more"
- User preference cache
- Profile/comment-open tracking
