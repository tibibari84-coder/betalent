# BeTalent Coin & Gift Economy

**Product architecture · Monetization system**  
*Internal virtual currency and creator support. No payment integration in this document.*

---

## 1. What Coins Are

- **Definition:** Coins are BeTalent’s **in‑platform virtual currency**. They have no cash value outside the product and cannot be exchanged back to real money by users.
- **Purpose:** The **only** way to send gifts to performers. Users spend coins; performers receive value attributed in coins (then subject to revenue share and payouts).
- **Scope:**
  - Coins are **purchased** with real money (later: Stripe / payment provider). Purchase flow and pricing are out of scope for this doc.
  - Coins are **spent** only on gifts. There are no other coin sinks (e.g. no boosting, no ads).
- **Invariants:**
  - Coins are **non‑transferable** between users (no P2P sending of balance).
  - Coins are **non‑withdrawable** by viewers; only the platform can convert creator earnings to payouts.
  - Balance is **user‑scoped**: one coin balance per user account; no “house” or “team” wallets for MVP.

---

## 2. What Gifts Are

- **Definition:** Gifts are **music‑themed virtual items** that viewers send on a **video** to support the performer. Each gift has a fixed **coin cost** and optional **display label** (e.g. “Bronze Mic”, “Diamond Voice”).
- **Catalog (aligned with existing constants):**

  | Gift ID        | Display name    | Coin cost |
  |----------------|-----------------|-----------|
  | BRONZE_MIC     | Bronze Mic      | 50        |
  | SILVER_GUITAR  | Silver Guitar   | 100       |
  | GOLDEN_PIANO   | Golden Piano    | 250       |
  | DIAMOND_VOICE  | Diamond Voice   | 500       |

- **Behavior:**
  - Sending a gift **consumes** the sender’s coin balance by the gift’s coin cost.
  - The same **coin amount** is the basis for revenue split: 70% to performer, 30% to platform (see below).
  - Gifts are **attributed to a specific video** and to the **video’s owner (performer)**. They are not sent to “channel” or “profile” in isolation; the primary entity is the video.
  - Gifts are **immutable** once sent (no refunds or cancellations in MVP).

---

## 3. How Gifts Are Sent

- **Trigger:** A logged‑in user with sufficient coin balance chooses a gift and sends it **on a video** (video detail / playback context).
- **Rules:**
  1. **Balance check:** Sender’s coin balance ≥ gift’s coin cost; otherwise the send is rejected.
  2. **Debit:** Sender’s balance is decreased by the gift’s coin cost (atomic with the next steps).
  3. **Credit (creator side):** Performer’s **creator earnings** are increased by the **creator share** (70% of the gift’s coin value). See “Revenue split” below.
  4. **Platform share:** Platform’s share (30%) is recorded for internal accounting; no “platform wallet” needed for MVP.
  5. **Aggregation:** The video’s **gift/coin counter** (e.g. `coinsCount`) is increased by the gift’s **coin cost** (full amount, for display and ranking). The performer’s **total coins received** (e.g. `totalCoinsReceived`) is increased by the same **coin amount** (or by creator share only—see “Counters” below; recommendation: store full coin amount on video and on creator for display, and derive creator earnings from that for payouts).
- **Idempotency:** Optional idempotencyKey on send; replay returns stored response; no double-spend. See ANTI-ABUSE-COIN-GIFT.md.

---

## 4. Revenue Split

- **Rule:** For every gift sent, the **gift’s coin cost** is split:
  - **70%** → performer (creator earnings).
  - **30%** → platform.
- **In coins:** All booking is in coins. Example: 100‑coin gift → 70 coins to creator earnings, 30 coins to platform.
- **Implementation:** Split logic is **centralized** in `src/services/revenue-split.service.ts` (`computeGiftSplit`, `getSplitConfig`). All gift flows use this service; no hardcoded percentages elsewhere. Rounding: creator share = floor(creatorPercent% of gross); platform share = gross − creator share (so totals always match).
- **Future:** The service accepts optional context (`giftId`, `campaignId`) so the split can be made **configurable** later for special gift campaigns or promotional events (e.g. 80/20 promos) without changing call sites.
- **Payouts:** Conversion of “creator earnings (coins)” to real money and actual payouts (thresholds, methods, Stripe Connect, etc.) are **out of scope** for this document and for MVP.
- **Accounting:** The system must be able to report, per creator and per time window: total coins received from gifts, creator share (70%), and platform share (30%). Storing one “gift transaction” record per send (with coin amount, creator_id, video_id, sender_id, creator_share, platform_share) is sufficient for that.

---

## 5. Creator Earnings Tracking

- **Purpose:** To know how much of the gift flow belongs to the creator (for future payouts and for optional in‑app display, e.g. “Earnings” in dashboard).
- **Ledger-safe model (implemented):**
  - **Per gift:** Each gift write creates a **CreatorEarningsLedger** entry (creatorId, sourceType GIFT_TRANSACTION, sourceId = giftTransaction.id, grossCoins, creatorShareCoins). Ledger is the **source of truth** for audit.
  - **Per creator:** **CreatorEarningsSummary** (one row per creator) holds: **availableEarningsCoins** (balance for future payout), **totalEarningsCoins** (lifetime creator share), **totalGiftsReceivedCount** (lifetime gift count), **pendingPayoutCoins** (for future payout state). This table is updated **in the same transaction** as the ledger write (in gift.service), so it is ledger-derived and not front-end-only. Reads are O(1). `reconcileFromLedger(creatorId)` can recompute from ledger for audit or repair.
  - **Per video:** The video’s **coinsCount** is the total coin value of gifts on that video; **giftsCount** is the number of gifts.
- **APIs:** `GET /api/auth/me` includes `creatorEarnings`; `GET /api/creators/me/earnings` returns the same summary. No real payouts or Stripe/PayPal in scope; tracking only.
- **Separation:** Creator earnings are **only** from gifts (coin‑based). They are **not** mixed with likes, votes, or any other metric.

---

## 6. Counters and How They Behave

- **Likes, votes, and gifts are separate.** No counter is reused for another meaning.
- **Definitions:**

  | Counter / concept           | Scope        | Meaning |
  |-----------------------------|-------------|---------|
  | **likesCount** (e.g. video) | Video       | Number of like actions on this video. |
  | **votesCount** (if used)     | Video / poll | Number of vote actions (e.g. challenge votes). |
  | **coinsCount** (e.g. video) | Video       | **Total coin value** of all gifts sent on this video (sum of gift coin costs). |
  | **totalCoinsReceived**      | User/creator| **Total coin value** of all gifts received on all their videos (sum of coin_amount). |

- **Display:**
  - On video: show likes, (votes if applicable), and **gifts in coins** (e.g. “1.2K coins” or “❤️ 12 · 🎁 500 coins”). Do not show “gift count” as if it were like count; keep “coins” wording so the economic meaning is clear.
  - On profile: e.g. “Total coins received” or “Gifts received (coins)” for creators.
- **Ranking / scoring:** If leaderboards or discovery use “support” or “earnings”, use **coinsCount** (or totalCoinsReceived) and **not** likes or votes. Existing scoring that uses `coinsCount` with weight 5 is consistent with “gifts matter more for ranking” and should stay separate from like/comment weights.

### 6.1 Video-level gift counters

- **On Video:** `coinsCount` = total coins received (all gifts); `giftsCount` = total number of gifts. Both are updated **in the same transaction** as each GiftTransaction (no recalculation on read).
- **Gift count by type:** **VideoGiftTypeSummary** (videoId, giftId, count): one row per video per gift type, upserted in the same tx as the gift send. Enables "X Bronze Mics, Y Silver Guitars" under the video without aggregating GiftTransaction on every page load.
- **Top supporters:** **VideoSupporterSummary** (videoId, userId, totalCoinsSent, giftsCount): one row per video per sender, upserted in the same tx. Enables "Top supporters" list (order by totalCoinsSent desc) for premium UI under the video.
- **API:** `GET /api/videos/[id]` includes `video.giftSummary`: `totalCoinsReceived`, `totalGiftsReceived`, `giftCountByType[]` (giftId, slug, name, coinCost, count), `topSupporters[]` (user id/username/displayName/avatarUrl, totalCoinsSent, giftsCount). Empty arrays/zeros when no gifts.

### 6.2 Creator-level monetization counters

- **Per creator:** Counters stay consistent with gift transactions; all updated in the same tx as each GiftTransaction.
- **Total gifts received:** CreatorEarningsSummary.totalGiftsReceivedCount.
- **Total coin support received:** User.totalCoinsReceived (gross coins from all gifts).
- **Total earnings credited:** CreatorEarningsSummary.totalEarningsCoins (creator share, 70%).
- **Weekly support amount:** CreatorSupportWeekly (creatorId, year, week, totalCoinsReceived, giftsCount); row for current ISO week.
- **All-time support amount:** Same as total coin support received (User.totalCoinsReceived).
- **APIs:** `GET /api/profile/[username]` includes `profile.monetization` (all five counters + year/week). `GET /api/profile/[username]/monetization` returns only monetization. `GET /api/creators/leaderboard/weekly?year=&week=` returns top creators by support for that week (ready for leaderboard UI).

---

## 7. Integrated System (Current)

The full internal economy is wired in one place. See **ECONOMY-INTEGRATION.md** for the module map, single gift-send flow (audit trail), data flow, APIs, and production notes.

**In scope now (no real payments):**
- **Gift catalog** – From DB; active gifts with coin cost and rarity.
- **Wallet** – Balance, debit (gift send), credit (purchase fulfillment only; purchase is placeholder).
- **Gift sending** – Single transaction: debit, GiftTransaction, 70/30 split, creator ledger + summary, platform ledger, video and creator counters, idempotency, anti-abuse (rate limit, self-gift block, duplicate block, abuse flags).
- **Transaction logging** – CoinTransaction, GiftTransaction, CreatorEarningsLedger, PlatformRevenueLedger (all in same tx).
- **Creator earnings** – Ledger + CreatorEarningsSummary; profile monetization and earnings APIs.
- **Platform revenue** – PlatformRevenueLedger; admin visibility.
- **Video counters** – coinsCount, giftsCount, VideoGiftTypeSummary, VideoSupporterSummary.
- **Creator counters** – totalCoinsReceived, totalCoinsSpent, CreatorSupportWeekly, CreatorSupporterSummary.
- **Notifications** – Gift notifications derived from GiftTransaction (message includes gift name).
- **Anti-abuse** – Idempotency keys, rate limits, suspicious flags, moderation-ready.
- **Coin purchase** – Placeholder: create order (PENDING); wallet credited only when order is fulfilled (future: payment provider webhook).

**UI (minimal):** Balance in header/gift modal; send-gift on video; profile support/earnings block; video support module. No extra dashboards for the internal economy.

---

## 8. Delayed Until Later

- **Payment integration:** Stripe (or other) for buying coins. Architecture ready (CoinPurchaseOrder, fulfillOrder, provider abstraction); see COIN-PURCHASE-ARCHITECTURE.md.
- **Creator payouts:** Converting creator earnings (70% of coins) to real money, minimum payout threshold, Stripe Connect (or similar), payouts dashboard.
- **Legal and compliance:** Virtual currency disclosure, terms, regional restrictions, tax reporting (e.g. 1099), handling of minors.
- **Advanced economy:** Promotions (bonus coins), limited-time gifts, gifting to multiple performers in one action, gift animations or levels, “top supporters” lists.
- **Robustness:** Idempotency and anti-abuse are implemented; optional: reconciliation jobs, reporting pipelines.

---

## Economy layer separation (do not mix with likes/votes)

The coin and gift economy is a **separate layer**. These six areas must stay clearly separated in code and data:

| Area | Responsibility | Source of truth / writer |
|------|----------------|---------------------------|
| **Wallet balance** | Spendable coins per user. | `UserWallet`; updated only by `wallet.service` (debit/credit). |
| **Gift sending** | One send = debit + one `GiftTransaction`; no other flows create gift transactions. | `gift.service.sendGift()` only. |
| **Creator earnings** | Creator share (70%) from gifts; for payouts and display. | `CreatorEarningsLedger` + `CreatorEarningsSummary`; written only in gift flow. |
| **Platform revenue** | Platform share (30%) from gifts; for accounting. | `PlatformRevenueLedger`; written only in gift flow. |
| **Counters** | Video `coinsCount`/`giftsCount`; user `totalCoinsReceived`/`totalCoinsSpent`; supporter/weekly summaries. | Updated only in gift flow (same tx as `GiftTransaction`). |
| **Transaction history** | **Wallet audit:** `CoinTransaction` (debits/credits). **Gift audit:** `GiftTransaction` (each gift send). | `CoinTransaction` written by `wallet.service`; `GiftTransaction` by `gift.service`. |

**Do not mix likes, votes, and gifts.** Likes and votes are engagement metrics only; they are not part of wallet, gift sending, creator earnings, platform revenue, or coin transaction history. Counters such as `likesCount` and `coinsCount` are separate; ranking/scoring may use both but must not conflate them in the economy layer.

---

## Summary Table

| Concept            | Definition |
|--------------------|------------|
| **Coins**          | In-app virtual currency; bought with real money (later); spent only on gifts; one balance per user. |
| **Gifts**          | Music-themed items with fixed coin cost; sent on a video; one send = one debit + one transaction. |
| **Revenue split**  | 70% performer, 30% platform, applied to the gift’s coin cost. |
| **Creator earnings** | 70% of all coins received from gifts on their videos; tracked for future payouts. |
| **Counters**       | likesCount, votesCount (if any), coinsCount (video), totalCoinsReceived (creator)—all separate. |
| **MVP**            | Balance, gift catalog, send-gift flow, transaction + counters, no real purchase, no payouts. |
| **Later**          | Stripe (buy coins), payouts, legal, advanced economy, idempotency and fraud. |

This document is the single source of truth for the coin and gift economy. Implementation (DB schema, APIs, UI) should follow these rules.

---

## Optional DB constraint (PostgreSQL)

To enforce **senderId ≠ receiverId** at the database level for `GiftTransaction`:

```sql
ALTER TABLE "GiftTransaction"
ADD CONSTRAINT "GiftTransaction_sender_not_receiver"
CHECK ("senderId" != "receiverId");
```

Run this in a migration or manually after creating the table. Application code must also enforce this rule before creating a gift transaction.
