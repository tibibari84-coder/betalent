# BeTalent Top Supporters System

**Data and query architecture · Ranking readiness · No UI overbuild**

---

## 1. Goal

- **Videos** can show top supporters of that video (who sent the most gifts/coins to this video).
- **Creator profiles** can show top supporters of that creator (who sent the most support across all the creator’s videos).
- Ranking is by **total coins sent**; display fields support name, avatar, and optional country flag in future UI.

---

## 2. Data Architecture

### 2.1 Video-level top supporters (existing)

| Concept | Implementation |
|--------|-----------------|
| **Store** | `VideoSupporterSummary`: one row per (videoId, userId). Fields: `totalCoinsSent`, `giftsCount`. |
| **Updated** | In the same transaction as each `GiftTransaction` (upsert by videoId + senderId). |
| **Ranking** | Order by `totalCoinsSent` descending. |
| **Query** | `VideoSupporterSummary` where `videoId = ?`, order by `totalCoinsSent` desc, take N, include `user` (id, username, displayName, avatarUrl, country). |
| **Display-ready** | Each row exposes: userId, username, displayName, avatarUrl, country (for future flag), totalCoinsSent, giftsCount. Rank = index + 1. |

Source of truth for “who supported this video” remains `GiftTransaction`; the summary table is a materialized view updated atomically so no aggregation on read.

### 2.2 Creator-level top supporters (new)

| Concept | Implementation |
|--------|-----------------|
| **Store** | `CreatorSupporterSummary`: one row per (creatorId, userId). Fields: `totalCoinsSent`, `giftsCount`. |
| **Updated** | In the same transaction as each `GiftTransaction`: upsert by creatorId (= video.creatorId) + userId (= senderId), increment totalCoinsSent and giftsCount. |
| **Ranking** | Order by `totalCoinsSent` descending. |
| **Query** | `CreatorSupporterSummary` where `creatorId = ?`, order by `totalCoinsSent` desc, take N, include `user` (supporter: id, username, displayName, avatarUrl, country). |
| **Display-ready** | Each row exposes: userId, username, displayName, avatarUrl, country (for future flag), totalCoinsSent, giftsCount. Rank = index + 1. |

Same pattern as video-level: transaction-safe, no recalculation on page load, ranking and display fields ready for UI.

---

## 3. Query Patterns

- **Video page:** “Top supporters of this video” → query `VideoSupporterSummary` by `videoId`, order by `totalCoinsSent` desc. Already returned in `GET /api/videos/[id]` as `video.giftSummary.topSupporters`.
- **Creator profile:** “Top supporters of this creator” → query `CreatorSupporterSummary` by `creatorId`, order by `totalCoinsSent` desc. Exposed via `GET /api/profile/[username]/supporters?limit=20` (max 100). Returns `supporters[]` with rank, userId, username, displayName, avatarUrl, country, totalCoinsSent, giftsCount.

---

## 4. Display Fields (UI-ready, not built)

Both video and creator top-supporter payloads include:

- **userId** – stable id for links/APIs  
- **username** – profile URL  
- **displayName** – primary label  
- **avatarUrl** – avatar image  
- **country** – optional, for future country flag in UI  
- **totalCoinsSent** – primary sort/display value  
- **giftsCount** – secondary (number of gifts)  
- **rank** – 1-based position in the list (when returned as an ordered list)

No UI components are built in this design; only the data shape and APIs are defined.

---

## 5. Consistency and Scalability

- All summary rows are updated **in the same Prisma transaction** as the corresponding `GiftTransaction`, so they stay consistent with gift history.
- Reads are **single-table (or one join to User)** by video or creator; no aggregation over `GiftTransaction` on request.
- Indexes: `(videoId)`, `(creatorId)` and ordering by `totalCoinsSent` keep top-supporters queries scalable.
