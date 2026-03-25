# BeTalent Creator Leaderboard System

Goal: rank **creators** by **total influence** across Daily, Weekly, and All Time leaderboards, with optional filter by **category**.

---

## 1. Creator score formula

```
creator_score =
  (total_votes   * 3)
+ (total_likes   * 2)
+ (total_shares  * 3)
+ (followers     * 2)
+ (video_completion_rate * 5)
```

- **total_votes:** Sum of `Video.score` (or leaderboard votes) for the creator’s videos in scope (all-time or in-window).
- **total_likes:** Sum of likes on the creator’s videos in scope (`User.totalLikes` for all-time, or count from `Like` in window).
- **total_shares:** Sum of `Video.sharesCount` for the creator’s videos in scope (no share events; use aggregate).
- **followers:** `User.followersCount` (all-time) or new followers in window when available.
- **video_completion_rate:** 0–1. When view events exist: avg(watch_time / duration) per video. Today: proxy from `(totalLikes + totalComments) / max(totalViews, 1)` capped to 1, or default 0.5.

Weights are configurable in `src/constants/creator-leaderboard.ts`.

---

## 2. Leaderboard types

| Type | Description | Scope |
|------|-------------|--------|
| **Daily** | Rank by engagement in the last 24 hours | Votes, likes (and optionally shares/followers) from events with `createdAt >= now - 24h`. |
| **Weekly** | Rank by engagement in the last 7 days | Same, window = 7 days. |
| **All Time** | Rank by cumulative totals | `User.totalVotes`, `User.totalLikes`, sum of video shares, `User.followersCount`, completion proxy. |

For Daily/Weekly, only **in-window** engagement is counted (from `GiftTransaction`, `Like`, `Comment`). Shares and followers use all-time aggregates until share/follow events are bucketed. Completion uses all-time proxy.

---

## 3. Categories

Leaderboards can be scoped to a **category** so creators are ranked only by their performance in that category:

- **Global (no category):** All videos count; rank all creators who have at least one READY video.
- **Per category:** Only videos in the chosen category count. Creator’s score = formula applied to that category’s videos only (votes/likes/shares from those videos; followers still all-time).

Category is passed as `categoryId` or `categorySlug`. Categories come from the `Category` table (e.g. singing, dance, instrument, rap, performance, special-talent). UI buckets (Music, Dance, Comedy, Magic, Art, Sports, Other) can map to one or more category slugs if needed (see `CREATOR_LEADERBOARD_CATEGORY_SLUGS` in constants).

---

## 4. Data sources

- **All Time – votes/likes:** `User.totalVotes`, `User.totalLikes`.
- **All Time – shares:** Sum of `Video.sharesCount` for creator’s READY videos (or future `User.totalShares` if added).
- **All Time – followers:** `User.followersCount`.
- **Daily/Weekly – votes:** Sum of `GiftTransaction.coinAmount` where `receiverId = creator` (or video.creatorId) and `createdAt` in window.
- **Daily/Weekly – likes:** Count of `Like` where video’s `creatorId` = creator and `createdAt` in window.
- **Completion:** Proxy `min(1, (totalLikes + totalComments) / max(totalViews, 1) * factor)` or 0.5 when no views.

---

## 5. Output

- **Ranked list of creators** with: rank, creator id, username, displayName, avatarUrl, country, score (and optional trend vs previous period).
- **Query params:** `type=daily|weekly|alltime`, `categoryId` or `categorySlug` (optional), `limit`, `offset`.

---

## 6. Code locations

- **Weights and types:** `src/constants/creator-leaderboard.ts`
- **Score computation and ranking:** `src/services/creator-leaderboard.service.ts`
- **API:** `GET /api/leaderboard/creators`
