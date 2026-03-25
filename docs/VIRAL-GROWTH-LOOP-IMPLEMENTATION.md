# Viral Growth Loop – Implementation Report

## Summary

BeTalent now has a viral growth loop similar to TikTok: shareable deep links with referral attribution, growth metrics, viral boost in ranking, and abuse prevention.

---

## 1. Endpoints Added / Changed

| Method | Route | Purpose |
|--------|-------|---------|
| **GET** | `/api/share/url?resourceType=video\|profile&resourceId=<id>` | Returns shareable URL with `?ref=userId` when authenticated. Used by ShareModal. |
| **POST** | `/api/share` | Track share event. **Changed:** rate limit (60/hr), stores `referrerId` on ShareEvent. |
| **GET** | `/api/growth/metrics` | Growth metrics: shares by type, top referrers, top shared videos. Requires auth. |

### Deep Link Route

| Route | Purpose |
|-------|---------|
| **GET** | `/v/[id]` | Short deep link. Redirects to `/video/[id]`. Preserves `?ref=` for attribution. |

---

## 2. Database Fields Added

### User
| Field | Type | Description |
|-------|------|-------------|
| `referrerId` | String? | User who invited this user (from shared link). Null = organic signup. |

### Video
| Field | Type | Description |
|-------|------|-------------|
| `sharesLast24h` | Int | Shares in last 24h. Keep fresh via your own scheduled job that recomputes from `ShareEvent`. Used for viral velocity boost. |

### ShareEvent
| Field | Type | Description |
|-------|------|-------------|
| `referrerId` | String? | User who shared (for growth metrics). |

### New Model: Referral
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID |
| `referrerId` | String | User who shared the link |
| `referredUserId` | String | New user who signed up (unique) |
| `videoId` | String? | Optional: video that was shared |
| `createdAt` | DateTime | Signup time |

---

## 3. Deep Link Flow

1. **Share:** User A shares video → ShareModal fetches `/api/share/url?resourceType=video&resourceId=<id>` → receives `https://app.com/video/123?ref=<userA_id>`.
2. **Open:** User B opens link → lands on `/video/123?ref=userA_id`.
3. **Cookie:** Middleware sets `betalent_ref=userA_id` (7 days, httpOnly).
4. **Signup:** User B goes to `/register` → RegisterForm receives `referrerId` from URL or cookie → sends to `POST /api/auth/register` with `referrerId`.
5. **Attribution:** Server stores `User.referrerId = userA_id`, creates `Referral(referrerId=userA_id, referredUserId=userB_id)`.

### Short Deep Link `/v/[id]`

- `/v/abc123` → redirects to `/video/abc123`
- `/v/abc123?ref=xyz` → redirects to `/video/abc123?ref=xyz` (preserves ref)

---

## 4. Viral Signal in Ranking

### Share Velocity

- `Video.sharesLast24h` = count of ShareEvent for this video in last 24h.
- Recompute on a schedule you operate (no built-in HTTP endpoint for this).

### Scoring Change

In `scoring.service.ts`, engagement quality now includes share velocity:

```ts
engagementQuality =
  likeRate * 0.35 + commentRate * 0.30 + shareRate * 0.20 + shareVelocity * 0.15;
```

- `shareRate` = sharesCount / maxShares (total shares, normalized).
- `shareVelocity` = sharesLast24h / maxSharesLast24h (recent shares, normalized).

Videos with high share velocity get a temporary boost in For You ranking.

---

## 5. Abuse Prevention

| Mechanism | Implementation |
|-----------|----------------|
| **Self-referral** | At signup, if `session.userId === referrerId`, `referrerId` is cleared. |
| **Share rate limit** | 60 shares per user per hour (or per IP when anonymous). `RATE_LIMIT_SHARES_PER_USER_PER_HOUR` in `constants/anti-cheat.ts`. |
| **Ref cookie validation** | Middleware only sets cookie when `ref` matches CUID-like pattern (`/^[a-z0-9]{20,30}$/i`). |

---

## 6. Growth Metrics Tracked

| Metric | Source |
|--------|--------|
| Shares per video | `Video.sharesCount`, `Video.sharesLast24h` |
| Shares by type | `ShareEvent` grouped by `resourceType` |
| Installs per share | `Referral` count per `referrerId` |
| Signup conversion | `Referral` / total signups (derived) |
| Top shared videos | `Video` ordered by `sharesCount`, `sharesLast24h` |
| Top referrers | `Referral` grouped by `referrerId` |

---

## 7. Migration

```bash
npx prisma db push
# or
npx prisma migrate dev --name viral-growth-loop
```
