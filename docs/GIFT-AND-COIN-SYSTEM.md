# BeTalent Gift and Coin System

**Product architecture · Monetization**  
*Coins are purchased by users and spent on gifts during videos or Live Battles. Revenue is split 70% creator / 30% platform. This document defines the system structure—no implementation.*

---

## 1. Design principles

- **Simple mental model.** Users buy **coins**; they spend coins on **gifts** to support creators. One currency (coins), one spend action (send gift).
- **Creator-first revenue.** The **revenue split** (70% creator, 30% platform) is applied at the point of gift spend so that creator earnings are clear and auditable.
- **Traceable.** Every gift and every coin purchase can be tied to **sender**, **receiver**, **gift type**, **value**, and **coin conversion** for payouts, ranking, and anti-abuse.
- **Aligned with product.** Gifts are used during **videos** (performance clips) and **Live Battles**; the same gift catalog and coin system apply in both contexts.

---

## 2. Coin system

### 2.1 What coins are

- **Coins** are the in-platform **virtual currency** that users purchase with real money and spend on gifts (and optionally other products, e.g. Super Votes, if the product supports them).
- Coins are **account-bound**: they are stored in the user’s **wallet** (balance) and decrease when the user sends a gift (or spends elsewhere); they increase only via purchase or optional promotions (e.g. bonus coins, rewards).

### 2.2 Purchasing coins

- **Flow:** User selects a **coin package** (e.g. 100, 500, 1000, 5000 coins), completes payment (via app store or web payment), then receives that number of coins in their wallet.
- **Packages** are predefined; each has a **coin amount** and a **price** (real-world currency, e.g. USD). Optional: **bonus coins** for larger packages (e.g. “5000 coins + 10% bonus”).
- **Currency:** Price is set in one or more fiat currencies (e.g. USD, EUR); conversion and local pricing are product/payment decisions.

### 2.3 Coin packages (example)

| Package name / ID | Coins | Price (example) | Optional bonus |
|-------------------|-------|------------------|----------------|
| Starter           | 100   | e.g. $0.99       | —              |
| Value             | 500   | e.g. $4.99       | —              |
| Popular           | 1000  | e.g. $9.99       | e.g. +50       |
| Premium           | 5000  | e.g. $39.99      | e.g. +500      |

- Package list, prices, and bonuses are **configurable** (product/pricing decisions). The system must store **package_id**, **coins_amount**, **price**, **currency** (and optional bonus) for each purchase and for display.

### 2.4 Wallet and balance

- Each user has a **coin balance** (wallet). **Balance** = sum of all coin credits (purchases, promotions) minus all coin debits (gifts sent, other spend).
- **Transactions** that change the balance must be **logged** (see section 6) so that balance is auditable and reversible in case of refund or dispute.
- **Minimum spend:** A user can only send a gift if their balance is at least the **gift’s coin value**. Otherwise the send is rejected or the user is prompted to buy coins.

---

## 3. Gift catalog

### 3.1 What gifts are

- **Gifts** are **virtual items** that users send to creators during a **video** (on a performance clip) or during a **Live Battle**. Each gift has a **coin value**; sending a gift **debits** the sender’s coins and **credits** the receiver (creator) with the corresponding value, subject to the revenue split.
- Gifts are **catalog items**: predefined ID, name, coin value, and optionally asset (icon, animation). The catalog is **stable** (same gift ID and value across the product) so that analytics and payouts are consistent.

### 3.2 Gift catalog (example)

| Gift ID (slug)   | Display name    | Coin value |
|------------------|-----------------|------------|
| music-note       | Music Note      | 10         |
| microphone       | Microphone      | 50         |
| golden-mic       | Golden Mic      | 200        |
| standing-ovation | Standing Ovation| 500        |
| diamond-record   | Diamond Record  | 1000       |

- **Coin value** is the number of coins **deducted from the sender** when the gift is sent. The same value is used to compute creator revenue and platform revenue (see section 4).
- New gifts can be added with a new **gift_id**, **display_name**, and **coin_value**; deprecated gifts can be hidden from the UI but retained in data for history.

### 3.3 Where gifts can be sent

- **On a video (performance clip):** User watches a performance; they can send a gift **to the creator** of that video. The gift is **attributed to that video** (and to that creator) for ranking, analytics, and display (e.g. “Support for [Creator] on this performance”).
- **During a Live Battle:** User watches the live battle; they can send a gift **to one of the two creators** (Creator A or B). The gift is attributed to that creator and to the **battle/event** for ranking and battle outcome (see LIVE-BATTLES-SYSTEM).
- **Rules:** Only **logged-in** users with sufficient **coin balance** can send. Rate limits and caps (e.g. max coins per user per creator per day) may apply per CREATOR-RANKING-SYSTEM and anti-abuse policy; the system must support applying those limits.

---

## 4. Revenue split

### 4.1 Rule: 70% creator, 30% platform

- When a user sends a gift of **V** coins (the gift’s coin value):
  - **Creator share:** 70% of V (in coin terms) is allocated to the **creator** (receiver).
  - **Platform share:** 30% of V (in coin terms) is allocated to the **platform**.
- **Conversion:** Coins are a virtual currency; for **payouts** to creators, coins are converted to **real money** at a defined **coin-to-cash** rate (e.g. 100 coins = $1 USD). That rate is a product/pricing decision; the system must support storing it and applying it when calculating creator earnings and payouts.
- **Formula (conceptual):**
  - Creator coins from this gift = V × 0.70  
  - Platform coins from this gift = V × 0.30  
  - Creator cash (if converted) = (V × 0.70) × (cash per coin rate)

### 4.2 What the system must store (per gift event)

- **Gift value (coins):** V = the gift’s coin value (e.g. 200 for Golden Mic).
- **Creator share (coins):** V × 0.70 (for payout and reporting).
- **Platform share (coins):** V × 0.30 (for reporting and revenue tracking).
- **Coin conversion:** The **cash value** of the gift (or of creator share) can be derived from the **coin-to-cash rate** at the time of the gift (or at payout time). The system should store either the rate at transaction time or the resulting cash amounts so that payouts are auditable.

---

## 5. System structure: entities and flows

### 5.1 Entities (logical)

| Entity | Purpose |
|-------|---------|
| **User (sender)** | Holds coin balance; initiates gift send. |
| **Creator (receiver)** | Receives gifts; earns 70% in coins (then convertible to cash). |
| **Coin package** | Defines a purchasable bundle: coin amount, price, currency, optional bonus. |
| **Wallet / balance** | User’s current coin balance; updated on purchase (credit) and gift send (debit). |
| **Gift type** | Catalog entry: gift_id, display_name, coin_value, optional asset. |
| **Gift transaction** | A single send event: sender, receiver, gift type, value, context (video or battle), timestamps. |
| **Coin transaction** | Any credit or debit to a wallet: purchase, gift send, refund, bonus, etc. |

### 5.2 Purchase flow (conceptual)

1. User selects a **coin package** (e.g. 1000 coins).
2. User completes **payment** (real money) via payment provider.
3. System **credits** the user’s wallet with the package’s coin amount (plus any bonus).
4. System **records** a **coin transaction** (type: purchase, user, amount, package_id, payment_ref, currency, price).
5. System **records** or links **revenue** (platform revenue from this purchase = price paid; coins are liability until spent).

### 5.3 Gift-send flow (conceptual)

1. User chooses to send a **gift** (e.g. Golden Mic) to a **creator** in a **context** (video X or Live Battle Y).
2. System checks: user logged in, **balance ≥ gift coin value**, and optional **rate limits / caps** (e.g. max coins per user per creator per day).
3. System **debits** sender’s wallet by the gift’s **coin value** (V).
4. System **records** a **gift transaction** (see section 6) including sender, receiver, gift type, V, creator_share (0.70 × V), platform_share (0.30 × V), context (video_id or battle_id), timestamp).
5. System **credits** the creator’s **earnings** (or payout balance) with creator_share (in coins); platform records platform_share for revenue.
6. Optional: **coin transaction** records for sender (debit) and for creator (credit to earnings balance) so that all balance changes are traceable.

### 5.4 Payout (creator earnings)

- Creators **accumulate** earnings in **coins** (70% of each gift). For **payout**, the platform converts creator coin balance to **cash** at the **coin-to-cash** rate and pays out (e.g. via bank transfer, PayPal). Minimum payout threshold and payout schedule are product decisions.
- The system must **track** per creator: **total coins earned** (from gifts), **total cash paid out**, and **current balance** (coins not yet paid out, or already converted and awaiting transfer). **Coin conversion** (rate and date) should be stored for each payout batch or conversion event.

---

## 6. Data to track

The system must **track** the following so that gifts, revenue, ranking, and payouts are correct and auditable.

### 6.1 Per gift (gift transaction)

| Field | Purpose |
|-------|---------|
| **Gift sender** | User ID (or account ID) of the person who sent the gift. |
| **Gift receiver** | Creator ID (or account ID) of the person who received the gift. |
| **Gift type** | Gift ID (e.g. golden-mic) so value and display name can be resolved. |
| **Gift value** | Coin value of the gift (e.g. 200). Same as catalog value for that gift type. |
| **Creator share (coins)** | 0.70 × gift value; used for creator earnings and payouts. |
| **Platform share (coins)** | 0.30 × gift value; used for platform revenue reporting. |
| **Context** | Where the gift was sent: **video_id** (performance clip) or **battle_id** / **event_id** (Live Battle). Optional: round or moment in battle. |
| **Timestamp** | When the gift was sent (UTC). |
| **Transaction ID** | Unique ID for this gift event (for idempotency, refunds, support). |

- **Coin conversion:** For payouts, the platform applies a **coin-to-cash** rate. That rate can be stored **per payout batch** or **per period**; the gift transaction itself stores **coin** amounts. Cash value = creator_share_coins × (cash_per_coin at payout time).

### 6.2 Per coin purchase

| Field | Purpose |
|-------|---------|
| **User** | Buyer (user ID). |
| **Package** | Package ID (e.g. 100, 500, 1000, 5000 coins). |
| **Coins credited** | Number of coins added to wallet (including bonus if any). |
| **Price paid** | Amount and currency (e.g. 9.99 USD). |
| **Payment reference** | External payment ID (app store, Stripe, etc.) for refunds and reconciliation. |
| **Timestamp** | When the purchase completed. |

### 6.3 Per wallet / balance change

- **User ID**, **balance** (current), and **history of transactions** (credits and debits with amount, type, reference to gift or purchase, timestamp) so that balance is auditable and can be recomputed.

### 6.4 Aggregates for product use

- **Creator earnings:** Sum of creator_share (coins) from all gift transactions where receiver = that creator; optionally in a time window (e.g. this month) for payouts and reporting.
- **Platform revenue from gifts:** Sum of platform_share (coins) from gifts; convert to cash at rate for revenue reporting.
- **SupportScore / ranking:** CREATOR-RANKING-SYSTEM and DISCOVERY-AND-RANKING-ALGORITHM use gift data (e.g. total coins received, supporter diversity, velocity) with caps and anti-abuse. The system must support **querying** gifts by receiver, by time window, and by sender (for diversity and velocity checks).

---

## 7. Summary: system structure

| Area | Design |
|------|--------|
| **Currency** | Coins; purchased via packages; stored in user wallet. |
| **Packages (example)** | 100, 500, 1000, 5000 coins (with configurable prices and optional bonuses). |
| **Gifts (example)** | Music Note (10), Microphone (50), Golden Mic (200), Standing Ovation (500), Diamond Record (1000). |
| **Where to send** | On a video (to the video’s creator); during a Live Battle (to one of the two creators). |
| **Revenue split** | 70% creator, 30% platform (applied at gift send; stored per transaction). |
| **Track per gift** | Gift sender, gift receiver, gift type, gift value (coins), creator share, platform share, context (video or battle), timestamp, transaction ID. |
| **Coin conversion** | Coin-to-cash rate used for creator payouts and platform revenue reporting; rate stored per payout period or batch. |
| **Wallet** | Balance = credits (purchases, bonuses) minus debits (gifts sent); all changes logged for audit and support. |

This document defines the **BeTalent gift and coin system** structure for product, design, and engineering. Implementation (payment provider, storage schema, APIs) is out of scope here.
