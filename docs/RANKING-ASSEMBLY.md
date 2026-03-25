# Ranking & discovery — assembly map (single reference)

This document is the **documented entry point** for how BETALENT orders and surfaces videos. It does not duplicate formulas; it points to the code that implements them.

## Principles

- **Fairness helpers** (`fair-discovery.service.ts`): gift caps, mega-creator dampening, underexposed boost, session creator repetition, trending gift share caps, diversity assembly — **not** ML/AI.
- **Weights & constants** (`constants/ranking.ts`): tunable knobs shared across surfaces.
- **For You** personalizes via affinity/history; **Trending** uses velocity windows; **New Voices** uses fair newcomer rules — each surface composes shared helpers where applicable.

## HTTP routes → services

| Surface | Route | Primary service / entry |
|--------|--------|-------------------------|
| For You | `GET /api/feed/for-you` | `for-you/feed-v2.service.ts` → `getForYouFeedV2` |
| Following | `GET /api/feed/following` | `fair-discovery.service.ts` (`interleaveFollowingFeedVideos`) + feed assembly |
| Trending | `GET /api/feed/trending` | `trending.service.ts` → `getTrendingVideos` → `ranking.service.ts` → `getTrendingRanked` |
| New Voices | `GET /api/feed/new-voices` | `new-voices-fair.service.ts` → `getNewVoicesFairVideoIds` |

## Core modules (by role)

| Module | Role |
|--------|------|
| `services/ranking.service.ts` | Aggregates scores, trending/challenge paths, `updateAllRankingStats`, `getTrendingRanked`, cron-facing refresh hooks |
| `services/for-you/feed-v2.service.ts` | For You candidate pipeline and ordering |
| `services/for-you/scoring.service.ts` | For You component scores; uses `capForYouGiftSupportQuality` from fair-discovery |
| `services/fair-discovery.service.ts` | Shared caps, dampeners, diversity, interleaving |
| `services/trending.service.ts` | Thin layer: public API for trending IDs from `ranking.service` |
| `lib/scoring.ts` | Simple weighted sum helper (views/likes/comments/coins) — **not** the main discovery stack; verify callers before using for product surfaces |

## Jobs / side effects

| Job | File | Notes |
|-----|------|--------|
| Ranking stats refresh | `api/cron/ranking-refresh` | `updateAllRankingStats` |
| Talent rank | `api/cron/rank-talents` | `talent-ranking.service.ts` |
| Gifts / super-vote | `api/gifts/send`, `api/videos/.../super-vote` | May call `upsertVideoRankingStats` to keep stats aligned |

## Audit checklist (when changing behavior)

1. Identify which **route** and **service entry** from the table above is affected.
2. Confirm **constants** changes in `constants/ranking.ts` and any **fair-discovery** cap/dampener interaction.
3. Run ranking/cron tests or manual smoke on **For You**, **Trending**, **New Voices** if weights or assembly order change.

See also: **`docs/SMOKE-FLOWS-CHECKLIST.md`** (platform-wide manual smoke).
