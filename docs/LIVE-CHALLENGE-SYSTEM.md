# Live Challenge System — Implementation Report

## 1. Models Created

### LiveChallengeSession
- `id`, `challengeId`, `status` (SCHEDULED | LIVE | ENDED)
- `startedAt`, `endedAt`, `currentPerformerId`, `roundNumber`
- Links to Challenge; has many LivePerformanceSlot, LiveVote, LiveGift

### LivePerformanceSlot
- `id`, `sessionId`, `performerUserId`, `videoId` (optional)
- `startTime`, `endTime`, `status` (WAITING | LIVE | COMPLETED)
- `slotOrder` — determines performer sequence

### LiveVote
- `id`, `sessionId`, `performerUserId`, `voterUserId`, `stars` (1–5)
- Unique on `(sessionId, performerUserId, voterUserId)` — one vote per user per performer, update allowed

### LiveGift
- `id`, `sessionId`, `performerUserId`, `senderUserId`, `coins`
- Deducts from sender wallet; credits performer

---

## 2. Real-Time Method Used

- **Primary**: Server-Sent Events (SSE) at `/api/live/sessions/[sessionId]/stream`
- **Fallback**: Polling every 2 seconds (`LIVE_POLL_INTERVAL_MS`)
- **Event bus**: In-memory `EventEmitter` in `lib/live-session-events.ts` — single-instance. For multi-instance, replace with Redis pub/sub.

---

## 3. Voting Logic

- Vote window: only during performer's slot (status LIVE or COMPLETED)
- Stars: 1–5
- One vote per user per performer per session; **update allowed** (upsert)
- **No self-vote** — blocked at service layer, fraud event recorded
- **Rate limit**: 10 votes per user per minute (`LIVE_VOTE_RATE_LIMIT_PER_MIN`)
- Votes stored in `LiveVote`; leaderboard recomputed on each vote/gift

---

## 4. Scoring Formula

```
liveScore =
  weightedVoteScore * W_vote +
  giftScore * W_gift +
  engagementBoost * W_engagement
```

- **weightedVoteScore**: Bayesian `(priorMean * priorWeight + sum(stars)) / (priorWeight + votesCount)` — prior 3.0, weight 2
- **voteScore**: `((weightedVote - 1) / 4) * 100` → 0–100
- **giftScore**: `min(giftCoins, 10000) / 100` → cap 10k coins = 100
- **engagementBoost**: `min(votesCount * 2, 20)` → votes as engagement signal
- **Weights**: `W_vote = 0.5`, `W_gift = 0.4`, `W_engagement = 0.1`

---

## 5. Leaderboard Behavior

- Sorted by `liveScore` descending
- Updates: on each vote and gift via event emission
- SSE clients receive `{ leaderboard }` on change
- Polling clients refresh every 2s
- Shows: rank, performer, stars, votes, gifts, liveScore

---

## 6. Anti-Abuse Logic

- **Self-vote**: Blocked; `recordFraudEvent` with `LIVE_SELF_VOTE_ATTEMPT`
- **Self-gift**: Blocked; `recordFraudEvent` with `LIVE_SELF_GIFT_ATTEMPT`
- **Rate limit**: 10 votes/user/min via `checkRateLimit('live-vote', userId, 10, 60000)`
- **Gift cap**: Max 1000 coins per single gift (`LIVE_GIFT_MAX_COINS`)
- **Wallet check**: Gift only if `coinBalance >= coins`

---

## 7. UI Structure

- **LiveChallengeView** (`components/live/LiveChallengeView.tsx`):
  - Main video area with LIVE badge and countdown timer
  - Voting panel: 5 star buttons (1–5), one-tap
  - Quick gift buttons: 10, 25, 50, 100 coins
  - Live leaderboard: rank, performer, stars, votes, score
- **Live page** (`app/(public)/live/[slug]/page.tsx`):
  - Fetches session from `/api/live/challenges/[slug]/session`
  - If `session.status === 'LIVE'`, renders `LiveChallengeView`
  - Otherwise shows countdown + challenge leaderboard (existing behavior)

---

## 8. Performance Considerations

- **DB writes**: Vote/gift each cause 1–2 writes; rate limiting reduces burst
- **Leaderboard**: Computed on read via `getLiveLeaderboard()` — aggregates votes and gifts. For high concurrency, add Redis cache keyed by `sessionId` with TTL 1–2s.
- **SSE**: Single connection per client; keepalive every 15s
- **Polling**: 2s interval; consider increasing to 3–5s if load is high
- **Batch**: No batching of votes; each vote is immediate for real-time feel

---

## 9. Admin Session Control

**POST** `/api/live/sessions/[sessionId]/admin`  
Body: `{ action: 'start' | 'next' | 'end' }`  
Requires: `User.role === 'ADMIN'`

- **start**: Sets status LIVE, first slot LIVE, `currentPerformerId`, 2 min timer
- **next**: Marks current slot COMPLETED, moves to next; if none, ends session
- **end**: Sets status ENDED, marks current slot COMPLETED

---

## 10. Integration

- **Challenge**: Session created from challenge entries via `/api/live/challenges/[slug]/session`
- **Wallet**: Live gifts use `UserWallet.coinBalance`; deduct on send
- **For You feed**: Unchanged; live system is separate
- **Challenge leaderboard**: Existing challenge leaderboard (ChallengeVote) is separate from live leaderboard (LiveVote)
