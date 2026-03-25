# Ranking Debug & Validation

Make ranking transparent and testable before further optimization.

---

## Debug Endpoints (dev only, 404 in production)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/debug/top-videos?limit=20` | Top ranked videos with score breakdown |
| `GET /api/debug/top-videos?compare=id1,id2` | Side-by-side comparison of 2 videos |
| `GET /api/debug/ranking/video/[videoId]` | Full ranking signals for a single video |
| `GET /api/debug/ranking/feed?limit=30` | For You feed with score breakdown per video |

---

## Debug Panel

**`/debug/ranking`**

- **Top 20** — Load top ranked videos with breakdown
- **Compare** — Enter 2 video IDs for side-by-side comparison
- **Inspect** — Enter 1 video ID for full signal inspection
- **Feed + Scores** — Load your For You feed with scores (requires auth)

Each video card shows:
- finalScore, retentionScore, completionRate, replayCount, skipCount
- earlyDistPhase, earlyDistMultiplier (early distribution)
- **Show score components** — Expandable: retentionQuality, engagementQuality, personalizationAffinity, decayMultiplier, etc.

---

## Score Breakdown (per video)

| Field | Description |
|-------|-------------|
| finalScore | Final ranking score after all multipliers |
| retentionScore | 0–1 from completion, watch time, skip, replay |
| completionRate | completedViews / viewCount |
| replayCount | Raw replay count |
| skipCount | Raw skip count |
| viewsCount | Total views |
| viewCount | Watch samples (with progress) |
| earlyDistPhase | seeding \| boosted \| suppressed \| graduated |
| earlyDistMultiplier | Early distribution multiplier |

---

## Full Explanation (score components)

| Field | Description |
|-------|-------------|
| baseScore | Weighted sum before multipliers |
| retentionQuality | 0–1 |
| engagementQuality | 0–1 |
| supportQuality | 0–1 |
| personalizationAffinity | 0–1 |
| freshnessAdjusted | Decay multiplier |
| creatorQuality | 0–1 |
| challengeRelevance | 0 or 1 |
| safetyPenalty | 0–1 (subtracted) |
| decayMultiplier | Half-life decay |
| newUploadBoost | 1.0 or 1.25 |
| creatorBoost | 1.0 or 1.2 (new creators) |
| earlyTestPhase | boolean |

---

## Logging

When `DEBUG_RANKING=1` or `NODE_ENV=development`:

- Top 10 videos in each For You response are logged with:
  - video ID, finalScore, retention, completion %, replay, skip, views
  - retentionQuality, engagementQuality, personalizationAffinity, decay

---

## For You API with debug

`GET /api/feed/for-you?debug=1` (dev only) returns `debug.scored` with scoreBreakdown and explanation for each video in the feed.
