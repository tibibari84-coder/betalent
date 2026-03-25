# BeTalent Support Leaderboard Architecture

## Overview

Support leaderboards rank by **total support (coins)** with tie-break by **gifts count**. The design uses **materialized counters** only: no aggregation over `GiftTransaction` at read time, so queries scale with the number of entities (users/videos), not transaction volume.

## Leaderboard Types

| Type | Description | Primary sort |
|------|-------------|--------------|
| **Top supported creators** | Creators who received the most support | `totalCoinsReceived` desc |
| **Top supporters** | Users who sent the most support (gifts) | `totalCoinsSpent` desc |
| **Most gifted performances** | Videos that received the most gifts | `Video.coinsCount` desc |

## Data Aggregation Approach

### Principle: Materialize in the gift transaction

All counters used for ranking are updated **in the same transaction** as `GiftTransaction` in `gift.service.sendGift()`. No batch recalc or aggregation over history at read time.

| Leaderboard | All-time source | Weekly source (when used) |
|-------------|-----------------|----------------------------|
| Top supported creators | `User.totalCoinsReceived` | `CreatorSupportWeekly` (per creator per ISO week) |
| Top supporters | `User.totalCoinsSpent` | Not yet (optional: `UserSupportSentWeekly`) |
| Most gifted performances | `Video.coinsCount` | Not yet (optional: `VideoSupportWeekly`) |

### Maintained in gift transaction

- **Creator (receiver):** `User.totalCoinsReceived` ↑, `CreatorSupportWeekly.totalCoinsReceived` ↑, `CreatorEarningsSummary.totalGiftsReceivedCount` ↑
- **Sender:** `User.totalCoinsSpent` ↑ (for top-supporters leaderboard)
- **Video:** `Video.coinsCount` ↑, `Video.giftsCount` ↑
- **Summaries:** `CreatorSupporterSummary`, `VideoSupporterSummary`, `VideoGiftTypeSummary` (for profile/video UI; leaderboards use User/Video directly)

## Ranking Strategy

1. **Order:** `totalSupportCoins DESC`, then `giftsCount DESC`, then stable tie-break (e.g. `id ASC`).
2. **Rank:** Assigned in application layer as `index + 1` after ordering (no dense rank in DB).
3. **Scope:** Only entities with `totalSupportCoins > 0` (or `coinsCount > 0` for videos) are included.
4. **Videos:** Only `status = READY` for “most gifted performances”.

## Query Architecture

- **Service:** `src/services/support-leaderboard.service.ts`
  - `getTopSupportedCreators(period, limit, options?)` → `LeaderboardCreatorRow[]`
  - `getTopSupporters(period, limit, options?)` → `LeaderboardCreatorRow[]`
  - `getMostGiftedPerformances(period, limit, options?)` → `LeaderboardPerformanceRow[]`
- **Types:** `src/types/leaderboard.ts`  
  - `LeaderboardType`, `LeaderboardPeriod`, `LeaderboardCreatorRow`, `LeaderboardPerformanceRow`
- **Periods:** `all_time` (default), `weekly` (supported for top supported creators via `CreatorSupportWeekly`; others can be added with weekly tables).

## UI-Ready Payload (Later-Ready)

Rows are returned ready for UI:

- **Creator rows** (top supported creators, top supporters):  
  `rank`, `userId`, `username`, `displayName`, `avatarUrl`, `country` (flag), `totalSupportCoins`, `giftsCount`
- **Performance rows** (most gifted performances):  
  `rank`, `videoId`, `videoTitle`, `creatorId`, `creatorUsername`, `creatorDisplayName`, `creatorAvatarUrl`, `creatorCountry`, `totalSupportCoins`, `giftsCount`

## Scalability and Efficiency

- **Indexes:**  
  - `User`: support `ORDER BY totalCoinsReceived DESC` / `totalCoinsSpent DESC` (existing or add as needed).  
  - `CreatorSupportWeekly`: `@@index([year, week, totalCoinsReceived])`.  
  - `Video`: index on `(status, coinsCount DESC)` for most-gifted queries.
- **Limit:** All queries cap at 100 items (configurable); typical use 20–50.
- **No N+1:** Single query per leaderboard type (with includes for creator/video where needed).
- **Weekly expansion:** To add weekly for supporters or performances, introduce materialized tables (e.g. `UserSupportSentWeekly`, `VideoSupportWeekly`) updated in the same gift transaction and query them by `(year, week)`.

## Optional Future Additions

- **User.totalGiftsSent:** If “gifts count” for top supporters is required without aggregating summaries.
- **UserSupportSentWeekly:** For weekly top supporters.
- **VideoSupportWeekly:** For weekly most gifted performances.
- **Caching:** Short TTL cache (e.g. 1–5 min) on leaderboard API responses if read volume is high.
