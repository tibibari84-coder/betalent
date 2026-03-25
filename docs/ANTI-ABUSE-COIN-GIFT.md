# BeTalent Anti-Abuse: Coin & Gift System

## Principles

- **Server-side validation only:** All checks run on the server. No client-trusted accounting; balance and limits are never trusted from the client.
- **Transaction integrity:** Validation and flagging run inside the same DB transaction as the gift flow. Either the full flow commits or nothing does.
- **Suspicious activity flags:** Detected abuse is recorded in `GiftAbuseFlag` for moderation. Blocked attempts are flagged; allowed but suspicious flows (e.g. new-account gift) are flagged without blocking.
- **Moderation readiness:** Admins can list abuse flags via `GET /api/admin/coin-gift/abuse-flags` and use existing admin visibility (transactions, suspicious heuristics) to review.

## Protections

| Threat | Mitigation |
|--------|-------------|
| **Self-gifting** | Reject when `senderId === video.creatorId`. Record `SELF_GIFT_ATTEMPT` before returning. |
| **Spam / rapid gifting** | Rate limit: max 5 gifts per sender per 1-minute window; max 3 gifts per (sender, receiver) per 5-minute window. Reject and flag `RATE_LIMIT_EXCEEDED` or `HIGH_FREQUENCY_PAIR`. |
| **Duplicate / replay** | (1) Idempotency key: same key + user within 24h returns stored response, no second debit. (2) Same sender/video/gift within 30s blocked and flagged as `DUPLICATE_ATTEMPT`. |
| **Fake accounts** | New-account gifts (account age &lt; 24h) are flagged as `NEW_ACCOUNT_GIFT` but not blocked. Moderation can review and escalate. |
| **Replay of request** | Client sends optional `idempotencyKey`. First request: process and store response under key. Replay: return stored response (200, same body). Key used by another user → 409 Conflict. |

## Flow (server-side)

1. **Idempotency** (inside tx): If `idempotencyKey` present, look up `GiftIdempotencyKey`. If key exists for same user and not expired → return stored response (replay). If key exists for different user → return 409. Otherwise continue.
2. **Load video/gift** and validate (existing).
3. **Self-gift:** If `senderId === receiverId`, record `SELF_GIFT_ATTEMPT`, return 400.
4. **Rate limit:** Count recent completed gift transactions for sender (1-min window) and for (sender, receiver) (5-min window). If over limit, record flag, return 429.
5. **Duplicate:** Count same sender/video/gift in last 30s. If any, record `DUPLICATE_ATTEMPT`, return 429.
6. **Debit and create gift** (existing).
7. **New-account flag:** If sender account age &lt; 24h, record `NEW_ACCOUNT_GIFT` (no block).
8. **Save idempotency** (if key provided): Store key + userId + response JSON for 24h.

All of the above run in a single `prisma.$transaction`. No partial state.

## Schema

- **GiftIdempotencyKey:** `key` (unique), `userId`, `responseBody`, `createdAt`. TTL 24h enforced in application (lookup ignores older rows).
- **GiftAbuseFlag:** `giftTransactionId?`, `senderId`, `receiverId?`, `videoId?`, `kind` (enum), `details?`, `createdAt`. Kinds: `SELF_GIFT_ATTEMPT`, `RATE_LIMIT_EXCEEDED`, `RAPID_GIFTING`, `HIGH_FREQUENCY_PAIR`, `NEW_ACCOUNT_GIFT`, `DUPLICATE_ATTEMPT`, `SUSPICIOUS_PATTERN`.

## API

- **POST /api/gifts/send**  
  Body may include `idempotencyKey` (optional).  
  New error codes: `RATE_LIMIT_EXCEEDED`, `HIGH_FREQUENCY_PAIR`, `DUPLICATE_ATTEMPT` (429), `IDEMPOTENCY_CONFLICT` (409).  
  On replay (same key + user), response is 200 with the same JSON as the original success.

- **GET /api/admin/coin-gift/abuse-flags**  
  Query: `limit`, `since`, `kind`, `senderId`. Returns persisted abuse flags for moderation.

## Configuration (in code)

- Idempotency TTL: 24h  
- Rate limit: 5 per sender per 1 min; 3 per (sender, receiver) per 5 min  
- Duplicate window: 30s  
- New-account threshold: 24h  

These live in `src/services/gift-anti-abuse.service.ts` for easy tuning.
