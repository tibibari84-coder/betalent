# BeTalent Economy Integration

**Single reference for the complete coin, gift, earnings, and counter system.**  
Modular, auditable, scalable. No real payments in scope; internal economy only.

---

## 1. Module Map

| Module | Role | Location |
|--------|------|----------|
| **Gift catalog** | List active gifts (id, name, slug, coinCost, rarity). No pricing logic. | `coin-package.service` (packages), `GET /api/gifts` (gifts from DB) |
| **Wallet** | Single source for balance: credit/debit only. No client-trusted accounting. | `wallet.service` |
| **Revenue split** | 70% creator / 30% platform. Single source of truth; used by gift send only. | `revenue-split.service` |
| **Gift send** | One transaction: debit → GiftTransaction → ledgers → all counters. | `gift.service` |
| **Transaction logging** | CoinTransaction (debit/credit), GiftTransaction (gift), CreatorEarningsLedger, PlatformRevenueLedger. | Written inside `gift.service` + `wallet.service` |
| **Creator earnings** | Ledger (source of truth) + CreatorEarningsSummary (cache, same tx). | Updated in `gift.service`; read via `creator-earnings.service`, `creator-monetization.service` |
| **Platform revenue** | PlatformRevenueLedger per gift. | Updated in `gift.service`; admin visibility in `admin-visibility.service` |
| **Video counters** | Video.coinsCount, giftsCount; VideoGiftTypeSummary; VideoSupporterSummary. | Updated in `gift.service`; read via `video-gift-summary.service` |
| **Creator counters** | User.totalCoinsReceived, totalCoinsSpent; CreatorSupportWeekly; CreatorSupporterSummary. | Updated in `gift.service` |
| **Notifications** | Gift notifications derived from GiftTransaction (no separate table). | `GET /api/notifications` aggregates likes, comments, follows, giftTransactions |
| **Anti-abuse** | Idempotency, rate limit, self-gift block, duplicate block, flags for moderation. | `gift-anti-abuse.service`; invoked inside `gift.service` tx |
| **Coin purchase (placeholder)** | Order creation; no wallet credit until payment confirmed (future). | `coin-purchase.service`, `payment-providers/mock-provider`, `GET/POST` coins APIs |

---

## 2. Single Gift-Send Flow (Audit Trail)

One successful `sendGift()` in a single DB transaction does the following in order:

1. **Idempotency** – If key present: replay or conflict check; no double-spend.
2. **Load** – Video, gift; validate active and self-gift.
3. **Anti-abuse** – Rate limit (per sender, per sender–receiver), duplicate window; record flags if blocked.
4. **Split** – `computeGiftSplit(coinAmount)` → creatorShare, platformShare (70/30).
5. **Debit** – `debitInTransaction(tx, senderId, coinAmount)` → CoinTransaction (GIFT_SENT), UserWallet balance down.
6. **GiftTransaction** – Create row (senderId, receiverId, videoId, giftId, coinAmount, creatorShareCoins, platformShareCoins, COMPLETED).
7. **Sender counter** – User.totalCoinsSpent += coinAmount.
8. **Creator earnings** – CreatorEarningsLedger insert; CreatorEarningsSummary upsert (availableEarningsCoins, totalEarningsCoins, totalGiftsReceivedCount).
9. **Platform revenue** – PlatformRevenueLedger insert (GIFT_TRANSACTION, platformShareCoins).
10. **Video counters** – Video.coinsCount += coinAmount, giftsCount += 1; VideoGiftTypeSummary upsert; VideoSupporterSummary upsert.
11. **Creator counters** – CreatorSupporterSummary upsert; User (receiver) totalCoinsReceived += coinAmount; CreatorSupportWeekly upsert (current ISO week).
12. **Moderation** – If new-account sender, GiftAbuseFlag (NEW_ACCOUNT_GIFT).
13. **Idempotency** – If key present, save response for replay.

Notifications are **read-only derived** from GiftTransaction (GET /api/notifications). No extra write.

---

## 3. Data Flow (No Client Trust)

- **Coins in:** Only via `wallet.service.credit()` with `type: 'PURCHASE'` and a **fulfilled** CoinPurchaseOrder (future: provider webhook). Placeholder purchase creates order only; no credit.
- **Coins out:** Only via `wallet.service.debitInTransaction()` from `gift.service` when sending a gift. Balance is checked server-side in the same transaction.
- **Creator earnings:** Only from CreatorEarningsLedger entries created in `gift.service`; summary is a cache updated in the same tx.
- **Counters:** All updated in the same transaction as GiftTransaction; no recalculation from history on read.

---

## 4. APIs (Economy Surface)

| API | Purpose |
|-----|---------|
| GET /api/coin-packages | Active coin packages (store). |
| GET /api/gifts | Active gift catalog (send-gift UI). |
| GET /api/wallet | Current user balance (requires auth). |
| POST /api/gifts/send | Send gift (videoId, giftId, optional idempotencyKey). |
| GET /api/notifications | Aggregated notifications (includes gifts). |
| GET /api/videos/[id]/support | Video-level support (coins, gifts, recent, top supporters). |
| GET /api/profile/[username]/monetization | Creator monetization summary. |
| GET /api/profile/[username]/supporters | Creator top supporters. |
| GET /api/leaderboard/support | Top creators / supporters / most-gifted performances. |
| POST /api/coins/purchase | Create purchase order (placeholder; no real payment). |
| Admin: /api/admin/coin-gift/* | Visibility and abuse flags (admin only). |

---

## 5. Scalability and Production

- **Single transaction per gift** – All or nothing; no partial state.
- **Materialized counters** – No aggregation over GiftTransaction for normal reads; use Video.*, User.*, CreatorEarningsSummary, CreatorSupportWeekly, *Summary tables.
- **Idempotency** – Replay-safe when client sends idempotencyKey.
- **Rate limits** – Per sender and per sender–receiver in anti-abuse service (configurable in code).
- **Audit** – CreatorEarningsLedger and PlatformRevenueLedger are append-only; GiftTransaction and CoinTransaction are full audit trail.
- **UI** – Minimal: balance in header/modal, send-gift on video, profile support/earnings section, video support module. No extra dashboards required for internal economy.

---

## 6. Related Docs

- **COIN-AND-GIFT-ECONOMY.md** – Product and domain rules (coins, gifts, split, counters).
- **ANTI-ABUSE-COIN-GIFT.md** – Anti-abuse rules and flags.
- **COIN-PURCHASE-ARCHITECTURE.md** – Purchase order and payment-provider abstraction (no real payments yet).
- **ADMIN-VISIBILITY-COIN-GIFT.md** – Admin visibility and abuse flags.
- **LEADERBOARD-ARCHITECTURE.md** – Support leaderboards.

The internal economy is built to stay solid first; payment integration (Stripe, etc.) and payouts can be added later without rewriting these modules.
