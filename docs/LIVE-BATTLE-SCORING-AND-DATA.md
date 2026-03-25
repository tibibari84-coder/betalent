# BeTalent Live Battle – Scoring and Data Model

Technical design for **head-to-head live battles**: two creators, 3-minute window, viewer support via gifts/coins/super votes, winner by battle_score. Complements the product doc `LIVE-BATTLES-SYSTEM.md`.

---

## 1. Battle rules

| Rule | Value |
|------|--------|
| **Duration** | 3 minutes (180 seconds) per battle. |
| **Participants** | Exactly two creators (Creator A vs Creator B). |
| **Viewer actions** | Viewers can send **gifts**, **coins** (direct vote value), and **super votes** during the battle window. |

All support is attributed to one of the two creators (recipient). The battle is in a single time window; voting/support is only counted when the battle status is LIVE.

---

## 2. Scoring

**Per-creator battle score:**

```
battle_score = gift_value + coin_votes + super_votes
```

- **gift_value:** Sum of coin value of all gifts sent to that creator during the battle (same as existing gift coin cost).
- **coin_votes:** Sum of coin amount for “coin votes” (e.g. direct coin spend that counts as vote; can be 1 coin = 1 point or configurable).
- **super_votes:** Sum of value of super votes (e.g. premium vote type with fixed or variable point value).

Stored as individual **BattleVote** (or **BattleSupport**) rows: `battleId`, `recipientCreatorId`, `senderId`, `voteType` (GIFT | COIN_VOTE | SUPER_VOTE), `amount`. Per-creator score = sum of `amount` for that creator in that battle.

---

## 3. Winner

- **Winner:** Creator with the **higher** `battle_score` when the battle ends. Tie-break: product rule (e.g. first to reach score, or draw).
- **Rewards** for the winner:
  - **Battle badge:** Stored (e.g. `BattleWinner` record or `User.battleWinsCount`); displayed on profile.
  - **Algorithm boost:** Flag or weight used by discovery/For You/leaderboard (e.g. short-term boost for battle winners).
  - **Bonus coins:** Credited to winner’s wallet via `CoinTransaction` type BONUS; amount from battle config or fixed.

Loser may receive a smaller consolation (optional).

---

## 4. Data model (summary)

- **LiveBattle** – id, status (SCHEDULED | LIVE | ENDED), startAt, endAt, durationSec (180), winnerId (set when ENDED), bonusCoinsForWinner, createdAt.
- **LiveBattleParticipant** – battleId, creatorId, slot (1 | 2). Exactly two per battle.
- **BattleVote** – battleId, recipientCreatorId (one of the two creators), senderId, voteType (GIFT | COIN_VOTE | SUPER_VOTE), amount, createdAt. Used to compute battle_score per creator.
- **BattleWinner** (optional) – battleId, winnerId, winnerScore, loserScore; used for badge and history.

Realtime: scores can be served via polling (GET battle scores) or WebSocket/SSE when implemented; the same data model supports both.

---

## 5. Code locations

- **Constants:** `src/constants/live-battle.ts` (duration, vote types, default bonus coins).
- **Types:** `src/types/live-battle.ts`.
- **Service:** `src/services/live-battle.service.ts` (create battle, record vote, end battle, compute winner, award bonus).
- **API:** `GET /api/battles/[id]`, `GET /api/battles/[id]/scores`, `POST /api/battles/[id]/vote`. End battle and award bonus coins via internal/cron calling `live-battle.service` `endBattle` then crediting winner wallet (e.g. `CoinTransaction` BONUS).

---

## 6. Realtime

- **MVP:** Clients poll `GET /api/battles/[id]/scores` every few seconds during LIVE.
- **Later:** WebSocket or SSE to push score updates and battle state (LIVE → ENDED) to connected viewers.
