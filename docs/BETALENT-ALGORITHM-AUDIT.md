# BeTalent – Algorithm / Feed Logic Audit

**Date:** March 2026  
**Scope:** Ranking, recommendation, feed, discovery, scoring, fraud, and related logic.  
**Method:** Direct codebase inspection. No implementation changes.

---

## 1. ACTUALLY IMPLEMENTED

### 1.1 For You Feed

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/ranking.service.ts` → `getForYouFeedRanked()`; `src/app/api/feed/for-you/route.ts` |
| **Inputs** | `userId`, `sessionCreatorIds` (creator IDs already shown), `limit` (default 30, max 50) |
| **Formula** | Four pillars with slot allocation: **ranking** (40%), **fresh** (25%), **styleMatch** (20%), **newCreator** (15%). Base score = `VideoRankingStats.rankingScore` × newCreatorBoost + freshness × 0.2 + styleMatch (0.15 if category in user's liked videos). Creator diversity: max 3 videos per creator; prefer different creator than last. |
| **Quality** | **Partial.** Uses `VideoRankingStats` (requires cron/job). Style match = liked categories only (no embeddings). No real personalization beyond category. |
| **Missing** | Real watch-time data (uses proxy). No negative feedback. No exploration/exploitation. `for-you-feed.service.ts` exists but is **not used** (dead code). |

---

### 1.2 Following Feed

| Aspect | Details |
|--------|---------|
| **Location** | `src/app/api/feed/following/route.ts` |
| **Inputs** | `currentUser.id`, `limit` (default 30, max 50) |
| **Formula** | Videos from followed creators, `orderBy: { createdAt: 'desc' }`, `take: limit`. No scoring. |
| **Quality** | **Basic.** Chronological only. No ranking by engagement or relevance. |
| **Missing** | Engagement-weighted ranking, recency decay, “best of” from followed creators. |

---

### 1.3 Trending Feed

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/ranking.service.ts` → `getTrendingRanked()`; `src/services/trending.service.ts`; `src/app/api/feed/trending/route.ts` |
| **Inputs** | `window` (3h, 6h, 12h, 24h), `limit` (default 30, max 50) |
| **Formula** | Velocity-based score in window: `superVotesPerHour×5 + giftCoinsPerHour×4 + commentsPerHour×2 + likesPerHour×1 + watchCompletionProxy×3`. Min engagement in window = 1. |
| **Quality** | **Partial.** Velocity logic is sound. Watch completion uses proxy (likes+comments)/views; `VideoWatchStats` is never populated. |
| **Missing** | Real watch completion. API supports 3h/6h but feed UI uses default 24h only. |

---

### 1.4 Explore Feed

| Aspect | Details |
|--------|---------|
| **Location** | `src/app/(public)/explore/page.tsx` → `getExploreData()` (server component) |
| **Inputs** | None (no user context, no filters) |
| **Formula** | **Trending:** `orderBy: viewsCount desc`, take 6. **New Voices:** `orderBy: createdAt desc`, take 6. **Rails:** same as trending, take 30, slice for rails. **Featured Performers:** dedupe by creator from trending. |
| **Quality** | **Basic.** No algorithm; simple sorts. “Rising Voices” rail uses same data as “Trending Performances” (bug). |
| **Missing** | Real “rising” logic, category filters, country filters, user preferences. |

---

### 1.5 Rising Talent Logic

| Aspect | Details |
|--------|---------|
| **Location** | `src/constants/ranking.ts` → `NEW_CREATOR_DISCOVERY_BOOST` (1.2); `ranking.service.ts` |
| **Inputs** | `creatorVideosCount <= 3` |
| **Formula** | New creators (≤3 uploads) get 1.2× boost in For You ranking. Also get extra slots in the newCreator pillar (15%). |
| **Quality** | **Basic.** Simple count-based boost. No velocity or “rising” trend. |
| **Missing** | Real “rising” detection (e.g. velocity, growth rate). Explore “Rising Voices” uses wrong data. |

---

### 1.6 Leaderboard Scoring

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/creator-leaderboard.service.ts`, `src/services/performance-leaderboard.service.ts`, `src/app/api/leaderboard/route.ts` |
| **Creator formula** | `totalVotes×3 + totalLikes×2 + totalShares×3 + followers×2 + videoCompletionRate×5`. Completion = proxy `(likes+comments)/views × 5`. Supports daily/weekly/monthly/alltime, country filter. |
| **Performance formula** | `talentScore×12 + votesCount×3 + supportCoins×2 + viewsCount×0.8 + likesCount×1.5 + commentsCount×1.2 + sharesCount×2`. Supports global/country, daily/weekly/monthly/all_time. |
| **Quality** | **Production-ready.** Clear weights, time windows, country filtering. |
| **Missing** | Watch-quality weight (0 in formula). Creator leaderboard uses `GiftTransaction` for “votes” in windowed mode (may not match `Video.score`). |

---

### 1.7 Talent Score Calculation

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/talent-score.service.ts`, `src/constants/talent-score.ts` |
| **Inputs** | `avgVote` (1–10), `likesCount`, `commentsCount`, `viewsCount` |
| **Formula** | `avgVote×0.6 + likeWeight×0.2 + commentWeight×0.1 + watchWeight×0.1`. Components normalized to 0–10: likes/5, comments/2.5, views/100. Only set when `votesCount >= 5`. |
| **Quality** | **Production-ready.** Clear formula, min-vote threshold. |
| **Missing** | None material. |

---

### 1.8 Vote Weighting

| Aspect | Details |
|--------|---------|
| **Location** | `src/app/api/vote/route.ts`; `Vote` model (value 1–10); `talent-score.service.ts` |
| **Inputs** | One vote per user per video (upsert). Value 1–10. |
| **Formula** | Votes feed into talent score (avgVote × 0.6). No separate vote weighting in feed/leaderboard beyond talent score. Performance leaderboard: `votesCount×3`. |
| **Quality** | **Basic.** All votes equal. No super-vote vs regular vote distinction in talent score. |
| **Missing** | Weighted votes (e.g. by voter reputation, recency). |

---

### 1.9 Gift/Support Weighting

| Aspect | Details |
|--------|---------|
| **Location** | `src/constants/ranking.ts` → `GIFT_TIER_WEIGHTS`, `SUPPORT_WEIGHTS`; `ranking.service.ts` |
| **Inputs** | Gift slug, coin cost; super votes, gift coins |
| **Formula** | **Support:** `superVote×3 + giftCoins×2` (normalized). **Gift tiers:** slug multipliers (e.g. golden-score 1.8, platinum-record 2). Used in `computeWeightedGiftScore()`. |
| **Quality** | **Partial.** Tier weights exist but slugs may not match gift catalog. |
| **Missing** | Verification that `GIFT_TIER_WEIGHTS` keys match actual gift slugs. |

---

### 1.10 View Counting Logic

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/view-tracking.service.ts`, `src/app/api/view/route.ts`, `src/app/api/videos/[id]/view/route.ts` |
| **Inputs** | `videoId`, `viewerKey` (userId or sessionId) |
| **Formula** | One view per `viewerKey` per video per 24h. `ViewRecord` + `Video.viewsCount` increment. |
| **Quality** | **Production-ready.** Throttling, session support. |
| **Missing** | None material. |

---

### 1.11 Share Influence

| Aspect | Details |
|--------|---------|
| **Location** | `src/app/api/share/route.ts`; `ENGAGEMENT_WEIGHTS.share` (3) in ranking |
| **Inputs** | `shareType` (copy_link, external), `resourceType` (video, profile), `resourceId` |
| **Formula** | Share event + `Video.sharesCount` increment. In ranking: share weight 3 (vs like 1, comment 2). |
| **Quality** | **Basic.** Share count used; no attribution or share-type weighting. |
| **Missing** | Share-type weighting, share-source tracking. |

---

### 1.12 Comment Influence

| Aspect | Details |
|--------|---------|
| **Location** | `ENGAGEMENT_WEIGHTS.comment` (2); talent score `commentWeight×0.1`; performance leaderboard `commentsCount×1.2` |
| **Inputs** | `commentsCount` |
| **Formula** | Comment weight 2 in engagement (like 1, share 3). Talent score: comments/2.5 normalized to 0–10. |
| **Quality** | **Basic.** Count-based only. |
| **Missing** | Comment quality, depth, recency. |

---

### 1.13 Follow Influence

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/creator-leaderboard.service.ts` → `CREATOR_SCORE_WEIGHTS.followers` (2) |
| **Inputs** | `User.followersCount` |
| **Formula** | Creator leaderboard: `followers×2` in score. Not used in For You, Following, or Explore. |
| **Quality** | **Basic.** Only in creator leaderboard. |
| **Missing** | Follow graph in discovery, “followers of people you follow,” etc. |

---

### 1.14 Country-Based Ranking/Discovery

| Aspect | Details |
|--------|---------|
| **Location** | `src/app/api/leaderboard/route.ts`, `src/app/api/global/countries/[countryCode]/talent/route.ts` |
| **Inputs** | `countryCode` (ISO 3166-1 alpha-2) |
| **Formula** | **Leaderboard:** filter creators/videos by `creator.country`. **Country talent API:** creators by `totalVotes desc`, videos by `isFeatured desc`, `score desc`, `createdAt desc`. |
| **Quality** | **Production-ready.** Country filter works. |
| **Missing** | Region/continent aggregation, “near you” logic. |

---

### 1.15 Challenge Ranking Logic

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/challenge.service.ts` → `getChallengeLeaderboard()`, `ranking.service.ts` → `computeChallengeRankingScore()` |
| **Inputs** | Challenge entries with video, supportStats, max values for normalization |
| **Formula** | `superVotes×4 + giftSupport×3 + engagementRatio×2 + likes×0.5` (normalized per challenge). Uses `VideoSupportStats` (totalSuperVotes, totalCoinsEarned). Excludes confirmed fraud via `getConfirmedFraudSupportSourceIds()`. |
| **Quality** | **Production-ready.** Support-heavy, fraud exclusion. |
| **Missing** | `Video.score` used as “votes” in output; may mix super-vote increments with other signals. |

---

### 1.16 Fraud / Anti-Spam Logic

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/fraud-risk.service.ts`, `src/constants/anti-cheat.ts`, `ranking.service.ts` |
| **Inputs** | Fraud events, support actions, risk profile |
| **Formula** | **Self-vote exclude:** `ANTI_SPAM_SELF_VOTE_EXCLUDE=true`; support from creator excluded in ranking. **Fraud exclusion:** `getConfirmedFraudSupportSourceIds()` excludes CONFIRMED_FRAUD support from challenge ranking and `upsertVideoRankingStats`. **Risk scoring:** FraudEvent weights (CRITICAL 15, HIGH 8, MEDIUM 3, LOW 1), cap 100. **Rate limits:** super votes 30/h, gifts 20/h, support 50/h. **Self-support:** super vote and gift to own content disallowed. |
| **Quality** | **Partial.** Structure exists. `shouldFlagAsLinkedAccountSupport()` returns false (placeholder). No automated fraud detection. |
| **Missing** | Linked-account detection, device/IP clustering, automated flagging. |

---

## 2. PARTIALLY IMPLEMENTED

### 2.1 Diversity / Freshness Logic

| Aspect | Details |
|--------|---------|
| **Location** | `ranking.service.ts` |
| **Implemented** | Creator diversity (max 3/creator), avoid back-to-back same creator. Freshness: 24h=1, 7d decay, 30d floor. New creator boost. |
| **Missing** | Category diversity, temporal diversity (avoid similar content), controlled exploration. |

---

### 2.2 Style-Based Personalization

| Aspect | Details |
|--------|---------|
| **Location** | `ranking.service.ts` → `getForYouFeedRanked()` |
| **Implemented** | Liked categories → +0.15 score if video in same category. 20% of slots for styleMatch pillar. |
| **Missing** | No embeddings, no genre/style model. Binary category match only. |

---

### 2.3 Watch-Time / Retention Logic

| Aspect | Details |
|--------|---------|
| **Location** | `ranking.service.ts` |
| **Implemented** | `VideoWatchStats` (totalWatchSeconds, completedViewsCount, viewCount) used when present. Fallback: `watchTimeProxy` = `(likes+comments)/views × 5`. Weight 0.25 in ranking. |
| **Missing** | **VideoWatchStats is never written.** No API or job populates it. All ranking uses proxy. |

---

### 2.4 Creator-Level Scoring

| Aspect | Details |
|--------|---------|
| **Location** | `src/services/talent-ranking.service.ts`, `src/constants/talent-ranking.ts` |
| **Implemented** | Creator tiers (STARTER→RISING→FEATURED→SPOTLIGHT→GLOBAL). Requirements: performances, views, votes, followers, completion, viral count, engagement ratio. Progress 0–1 toward next tier. `runTalentRankingJob()` updates User + `VideoRankingStats`. |
| **Missing** | Job must be run (cron). Completion rate uses default 0.5 (no watch data). Creator tier not used in For You feed. |

---

## 3. MISSING

| Item | Notes |
|------|------|
| **Real watch-time/retention** | `VideoWatchStats` exists but is never populated. No client reporting watch progress. |
| **Linked-account fraud detection** | `shouldFlagAsLinkedAccountSupport()` is a stub returning false. |
| **Explore “Rising Voices”** | Uses same data as “Trending Performances”; no distinct rising logic. |
| **Trending page vs API** | `/trending` page uses `orderBy: viewsCount desc` directly; does not use `/api/feed/trending`. |
| **Search** | `GET /api/search` returns `{ ok: false, message: 'Not implemented' }`. |
| **Negative feedback** | No skip, hide, or “not interested” signals. |
| **A/B testing / experimentation** | No framework for algorithm experiments. |

---

## 4. NEEDS REWORK

| Item | Issue |
|------|-------|
| **Trending page** | Server component fetches with `orderBy: viewsCount desc`; ignores trending API and velocity logic. |
| **Explore page** | “Rising Voices” rail duplicates “Trending Performances” data. No real rising algorithm. |
| **For You feed** | Depends on `VideoRankingStats`; if cron not run, all `rankingScore` are 0. No fallback. |
| **Creator leaderboard (windowed)** | Uses `GiftTransaction` for votes in window; `Video.score` (super votes) may not align. |
| **Dead code** | `for-you-feed.service.ts` and `constants/feed-algorithm.ts` exist but are unused. |
| **VideoSupportStats.totalSuperVotes** | In `coin.service`, upsert uses `packageKey` (number) for increment; schema expects Int—verify type consistency. |

---

## 5. SUMMARY TABLES

### By Component

| Component | Status | Quality |
|-----------|--------|---------|
| For You Feed | Implemented | Partial |
| Following Feed | Implemented | Basic |
| Trending Feed (API) | Implemented | Partial |
| Trending Page | Implemented | **Wrong** (ignores API) |
| Explore Feed | Implemented | Basic |
| Rising Talent | Implemented | Basic |
| Creator Leaderboard | Implemented | Production |
| Performance Leaderboard | Implemented | Production |
| Talent Score | Implemented | Production |
| Vote Weighting | Implemented | Basic |
| Gift/Support Weighting | Implemented | Partial |
| View Counting | Implemented | Production |
| Share Influence | Implemented | Basic |
| Comment Influence | Implemented | Basic |
| Follow Influence | Implemented | Basic |
| Country Discovery | Implemented | Production |
| Challenge Ranking | Implemented | Production |
| Fraud/Anti-Spam | Implemented | Partial |
| Diversity/Freshness | Implemented | Partial |
| Style Personalization | Implemented | Partial |
| Watch-Time/Retention | **Not populated** | N/A |
| Creator-Level Scoring | Implemented | Partial |

---

## 6. BRUTALLY HONEST CONCLUSION

### Is the current BeTalent recommendation logic strong enough for a real product?

**No.** It is enough for an MVP or closed beta, but not for a competitive, scalable product.

### Why not?

1. **For You is underpowered**  
   - Depends on `VideoRankingStats`; if the cron is not run, the feed collapses to freshness + style match.  
   - Style match is category-only, no embeddings or rich signals.  
   - No negative feedback, no exploration/exploitation, no real personalization.

2. **Trending is inconsistent**  
   - The trending API has solid velocity logic.  
   - The trending page ignores it and sorts by `viewsCount`.  
   - Users see “trending” that is not algorithmically trending.

3. **Explore is shallow**  
   - Simple sorts (views, createdAt).  
   - “Rising Voices” is a mislabeled duplicate of trending.  
   - No category or country filters, no user context.

4. **Watch-time is unused**  
   - `VideoWatchStats` exists but is never written.  
   - Watch quality is always proxied by engagement, which is easy to game.

5. **Fraud is only partially built**  
   - Self-vote exclusion and confirmed-fraud exclusion work.  
   - Linked-account detection is a stub.  
   - No automated clustering or pattern detection.

6. **Dead and duplicate logic**  
   - `for-you-feed.service` is unused.  
   - Two different For You approaches (ranking.service vs for-you-feed.service) add confusion.

### Does the whole For You / discovery / ranking system need a proper rebuild?

**Yes.** For a production-ready product you need:

1. **Unify and fix feeds**  
   - Use one For You implementation.  
   - Wire the trending page to the trending API.  
   - Implement real “Rising” logic for Explore.

2. **Add watch-time**  
   - Client-side progress reporting.  
   - Populate `VideoWatchStats`.  
   - Use it in ranking and trending.

3. **Improve personalization**  
   - Richer signals (embeddings, behavioral clusters, or similar).  
   - Negative feedback.  
   - Exploration/exploitation (e.g. bandits).

4. **Harden fraud**  
   - Implement linked-account detection.  
   - Add device/IP clustering.  
   - Automated flagging and review flows.

5. **Operationalize**  
   - Reliable cron for `VideoRankingStats` and talent ranking.  
   - Fallbacks when stats are stale.  
   - Monitoring and alerting.

The current system is a solid base with clear constants and services, but the discovery and recommendation layer needs a focused rebuild to be trustworthy and competitive.
