# Video Watch Tracking Pipeline

Complete pipeline for For You retention signals. **Critical for the recommendation system.**

## Flow

1. **FeedVideoPlayer** tracks watch behavior
2. Sends events to **POST /api/videos/[id]/watch-stat**
3. **watch-stat.service** updates **VideoWatchStats** (aggregated) and **UserWatchInteraction** (per-user)

## Events

| Event | When | isFinal | DB impact |
|-------|------|---------|-----------|
| Milestone | 25%, 50%, 75%, 100% watched | false | UserWatchInteraction only (if logged in) |
| Final | User scrolls away | true | VideoWatchStats + UserWatchInteraction |

## Detection

- **Quick skip**: watchedSeconds < 2 when leaving
- **Completion**: watchedPercent ≥ 90%
- **Rewatch**: currentTime goes from >0.5s back to <0.2s (loop or seek)

## Edge Cases

- **Scroll away** → send final event
- **Tab hidden** → no milestone sends (isTabVisibleRef)
- **Video paused** → currentTime doesn't advance (no counting)
- **Autoplay next** → new session, new final event

## API Payload

```json
{
  "watchedSeconds": 45,
  "watchedPercent": 0.9,
  "completed": true,
  "skippedQuickly": false,
  "replayed": false,
  "isFinal": true
}
```

## DB Schema

**VideoWatchStats** (aggregated per video):
- totalWatchSeconds
- completedViewsCount
- viewCount (sessions)
- skipCount
- replayCount

**UserWatchInteraction** (per-user per-video):
- watchTimeSec, completedPct, isRewatch, lastWatchedAt

## Validation

1. Log sample events in dev
2. Query `VideoWatchStats` after watching videos
3. Confirm completion detection (watch to end → completedViewsCount++)
4. Confirm skip detection (scroll away <2s → skipCount++)

---

## Retention Score in For You Ranking

When real watch data exists (`viewCount >= 3`):

```
completionRate     = completedViewsCount / viewCount
avgWatchSecPerView = totalWatchSeconds / viewCount
watchTimeQuality   = min(1, avgWatchSecPerView / 60)
replayBoost        = replayCount > 0 ? 0.2 : 0
skipPenalty        = skipCount > 0 ? 0.25 : 0

retentionScore = clamp(0, 1,
  completionRate × 0.85 +
  watchTimeQuality × 0.15 +
  replayBoost -
  skipPenalty
)
```

When no real watch data (fallback):

```
retentionScore = min(1, (likes + comments) / max(1, views) × 5)
```

**Constants** (`ranking.ts`):
- `FOR_YOU_REPLAY_BOOST = 0.2`
- `FOR_YOU_SKIP_PENALTY = 0.25`
- `FOR_YOU_WATCH_TIME_QUALITY_WEIGHT = 0.15`
- `FOR_YOU_MIN_WATCH_SAMPLE = 3`
