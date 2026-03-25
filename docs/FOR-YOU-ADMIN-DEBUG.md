# For You Feed — Admin Debug Panel

Internal debug/admin panel for visibility into why videos are ranked the way they are. **Not a black box** — all components are exposed.

---

## 1. Per-Video Debug View

Each video in the feed debug shows:

| Field | Description |
|-------|-------------|
| **rank** | Position in the final feed (1-based) |
| **bucket** | Candidate bucket: retention, support, engagement, fresh, challenge, rising, personalized, exploration, fallback |
| **retentionScore** | completionRate×0.70 + watchTimeQuality×0.15 + replayBoost − retentionSkipPenalty |
| **completionRate** | completedViews / viewCount (watch samples) |
| **watchTimeQuality** | avgWatchSecPerView / max(10, durationSec), clamped 0–1 |
| **replayBoost** | min(0.2, replayCount × 0.03) |
| **retentionSkipPenalty** | min(0.25, skipCount × 0.03) |
| **engagementScore** | likeRate, commentRate, shareRate, shareVelocity, followerGrowthProxy |
| **supportScore** | giftCoinsPerView×0.6 + voteRate×0.4 |
| **finalScore** | After all multipliers (watched, negative category, report, boost, early dist) |
| **viewsCount** | Raw view count (for context only; never used as primary signal) |
| **earlyDistPhase** | seeding | testing | boosted | suppressed | graduated |

---

## 2. Where Debug Logic Is Injected

| Location | Purpose |
|----------|---------|
| `getForYouFeedV2(params)` | When `params.debug === true`, computes and attaches `scoreBreakdown` and `explanation` to each `ScoredCandidate`. |
| `feed-v2.service.ts` (lines ~295–330) | Builds `ScoreBreakdown` with retention, engagement, support, final score, bucket. Calls `computePrimaryScore(..., params.debug)` to get `explanation`. |
| `feed-v2.service.ts` (lines ~518–535) | When debug, builds `debug.scored` from final `result` (feed order) with `rank` set per position. |
| `scoring.service.ts` | `computePrimaryScore(features, creatorVideosCount, debug)` returns `explanation` (retentionQuality, engagementQuality, supportQuality, etc.) when `debug=true`. |
| `GET /api/feed/for-you?debug=1` | Passes `debug: true` to `getForYouFeedV2`; returns `debug.scored` in response. **Dev only** (disabled in production). |
| `GET /api/admin/feed/for-you-debug` | Admin-only; always runs with `debug: true` and returns full breakdown. |

---

## 3. How Scoring Breakdown Is Exposed

- **API response shape** (when debug enabled):

```json
{
  "ok": true,
  "videos": [...],
  "debug": {
    "scored": [
      {
        "id": "video-id",
        "bucket": "global_quality",
        "score": 0.42,
        "scoreBreakdown": {
          "retentionScore": 0.65,
          "engagementScore": 0.32,
          "supportScore": 0.18,
          "finalScore": 0.42,
          "rank": 1,
          "bucket": "retention",
          "completionRate": 0.72,
          "viewsCount": 150,
          ...
        },
        "explanation": {
          "baseScore": 0.35,
          "retentionScore": 0.65,
          "completionRate": 0.72,
          "watchTimeQuality": 0.45,
          "replayBoost": 0.08,
          "retentionSkipPenalty": 0.03,
          "engagementQuality": 0.32,
          "supportQuality": 0.18,
          "personalizationAffinity": 0.1,
          "freshnessAdjusted": 0.8,
          "decayMultiplier": 0.8,
          "newUploadBoost": 1,
          "creatorBoost": 1,
          ...
        }
      }
    ]
  }
}
```

- **Admin API** (`/api/admin/feed/for-you-debug`) adds: `rankingBoostMultiplier`, `rankingDisabled`, `creatorDisplayName`, and full video metadata.

---

## 4. Admin Controls

| Control | API | Effect |
|---------|-----|--------|
| **Force boost** | `POST /api/admin/feed/video-override` `{ videoId, action: "boost", boostMultiplier: 1.5 }` | Multiplies final score by `boostMultiplier` (e.g. 1.5 = 50% boost). Clears `rankingDisabled`. |
| **Disable video** | `POST /api/admin/feed/video-override` `{ videoId, action: "disable" }` | Sets `rankingDisabled = true`; video excluded from For You and Trending. |
| **Reset** | `POST /api/admin/feed/video-override` `{ videoId, action: "reset" }` | Clears `rankingBoostMultiplier`, sets `rankingDisabled = false`. |

**Schema fields** (Video model):

- `rankingBoostMultiplier` (Float, nullable) — admin override; applied when computing final score.
- `rankingDisabled` (Boolean, default false) — when true, video excluded from feed.

---

## 5. Admin Access Control

| Mechanism | Where |
|-----------|-------|
| **requireAdmin()** | `src/lib/auth.ts` — throws `Unauthorized` if no user, `Forbidden` if `user.role !== 'ADMIN'`. |
| **API routes** | `GET /api/admin/feed/for-you-debug` and `POST /api/admin/feed/video-override` call `await requireAdmin()` at the start. |
| **Error handling** | 401 for unauthenticated, 403 for non-admin. |
| **Frontend** | `/admin/feed-debug` page calls admin API; on 403 shows "Access Denied". |
| **Navigation** | Link from Moderation page ("Feed Debug") — moderation is already admin-only. |

---

## 6. Weight Constants (Centralized)

Weights live in `src/constants/ranking.ts` — no magic numbers in scoring loop:

- `FOR_YOU_FINAL_WEIGHTS` — retention, support, engagement, personalization, freshness, challenge, creator, talent
- `FOR_YOU_RETENTION_WEIGHTS` — completionRate, watchTimeQuality, replayBoost, skipPenalty
- `LIGHTWEIGHT_WEIGHTS`, `FOR_YOU_FRESH_HOURS`, `FOR_YOU_HALFLIFE_HOURS`, etc.

To support runtime weight adjustment: add config table or env overrides; expose admin API; use in `computePrimaryScore`. Currently code constants; no runtime edit UI.
