# BeTalent Trending Detection System

Goal: detect **trending videos** from **rapid engagement growth** and expose them in Trending Today, Rising Now, and Viral Performances.

---

## 1. Trend signals

| Signal | Description | Source |
|--------|-------------|--------|
| **Votes per hour** | Leaderboard/gift score velocity | `GiftTransaction`: sum of `coinAmount` (or score contribution) in window, normalized to per-hour rate. |
| **Engagement velocity** | Likes + comments per hour | `Like` and `Comment` counts in window, normalized to per-hour. |
| **Share spikes** | Sudden increase in shares | When available: share events in window. Today: proxy from `Video.sharesCount` / age (or omit). |
| **Comment growth** | Comments in window | `Comment` rows with `createdAt` in window. |
| **Watch completion** | % of video watched to end | When available: view events with watch duration. Today: proxy from engagement ratio or neutral. |

---

## 2. Trend score formula

```
trend_score =
  (votes_last_hour   * 3)
+ (likes_last_hour   * 2)
+ (shares_last_hour  * 3)
+ (comments_last_hour * 2)
+ (watch_completion_rate * 5)
```

- **Per-hour rates:** For a window of `H` hours, use `count_in_window / H` (e.g. likes in last 6h → `likes_last_6h / 6`).
- **watch_completion_rate:** 0–1. When missing, use proxy: `min(1, (likes + comments) / max(views, 1) * 10)` or default `0.5`.

Weights are in `src/constants/trending.ts`.

---

## 3. Trend windows

Engagement is analyzed over:

| Window | Label / use |
|--------|--------------|
| **Last 6 hours** | Rising Now (fast momentum) |
| **Last 12 hours** | — |
| **Last 24 hours** | Trending Today, Viral Performances |

Configurable in `src/constants/trending.ts`. The service returns ranked videos per window.

---

## 4. Data sources (current)

- **Votes in window:** `GiftTransaction` where `videoId` and `createdAt >= now - window`, sum `coinAmount` (or use a dedicated score field if added). Normalize to per-hour.
- **Likes in window:** `Like` where `videoId` and `createdAt >= now - window`, count. Per-hour = count / hours.
- **Comments in window:** `Comment` where `videoId` and `createdAt >= now - window`, count. Per-hour = count / hours.
- **Shares in window:** No event table; use proxy: `Video.sharesCount / max(age_hours, 1)` or omit (0) for strictness.
- **Watch completion:** No view events; use proxy (e.g. engagement ratio capped to 1) or constant 0.5.

---

## 5. Trend output

Videos with highest `trend_score` in each window are used for:

- **Trending Today** — `GET /api/feed/trending?window=24h`, top N.
- **Rising Now** — `GET /api/feed/trending?window=6h`, top N (fast risers).
- **Viral Performances** — `GET /api/feed/trending?window=24h` (optional future: add minScore).

API returns ranked lists of full feed items. Optional query: `limit` (default 30, max 50).

---

## 6. Code locations

- **Weights and windows:** `src/constants/trending.ts`
- **Trend score computation and ranking:** `src/services/trending.service.ts`
- **API:** `GET /api/feed/trending?window=6h|12h|24h`

---

## 7. Future extensions

- **Share events:** Table `Share` with `videoId`, `userId`, `createdAt` for true share spikes.
- **Watch completion:** View events with `watchTimeSec` and `Video.durationSec` to compute completion rate.
- **Caching:** Precompute trend scores every 5–15 minutes and cache top N per window.
- **Min thresholds:** Exclude videos with very low absolute engagement (e.g. 1 like in 1h) from trending.
