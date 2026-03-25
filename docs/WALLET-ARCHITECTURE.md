# BeTalent User Wallet Architecture

Every user has exactly one wallet. All coin movements are server-authoritative, auditable, and applied in database transactions.

---

## 1. Wallet architecture

### 1.1 Principles

- **One wallet per user:** Created at registration; no manual creation.
- **Server is source of truth:** Balance and totals are never inferred from front-end; all reads and writes go through the backend.
- **Every change is traceable:** Each balance-affecting operation writes an audit record (e.g. `CoinTransaction`) in the same transaction as the wallet update.
- **Atomic updates:** Debit/credit and the corresponding transaction row are applied in a single Prisma `$transaction` to avoid races and partial updates.

### 1.2 Data stored in the wallet

| Field                 | Meaning |
|-----------------------|--------|
| `coinBalance`         | Current spendable coins (≥ 0). |
| `totalCoinsPurchased` | Lifetime coins added via purchase (and optionally bonus). |
| `totalCoinsSpent`     | Lifetime coins spent (e.g. on gifts). |

Invariant (for auditing): balance can be reconstructed from initial 0 + sum(credits) − sum(debits), where credits/debits are in `CoinTransaction` (or equivalent ledger).

### 1.3 Who can change the wallet

- **Backend only:** No direct `UserWallet` update from API handlers. All changes go through `WalletService` (or equivalent).
- **Debit:** Used when the user spends (e.g. sending a gift). Checks `coinBalance >= amount`; then decreases `coinBalance`, increases `totalCoinsSpent`, and writes a transaction record.
- **Credit:** Used when the user receives coins (purchase, refund, bonus). Increases `coinBalance`; for purchases, also increases `totalCoinsPurchased`. Writes a transaction record.

---

## 2. Backend service structure

### 2.1 Wallet service (`src/services/wallet.service.ts`)

Single entry point for wallet reads and balance-changing operations:

- **getOrCreateWallet(userId)**  
  Returns the user’s wallet; creates it if missing (safety for legacy or edge cases). Used after auth to ensure a wallet exists.

- **getBalance(userId)**  
  Returns current `coinBalance` (and optionally totals). Query by `userId` (indexed).

- **debit(userId, amount, options)**  
  Decreases balance by `amount`. Options: `type`, `referenceId`, `referenceType`, `description`.  
  - Fails if `coinBalance < amount`.  
  - In one Prisma transaction: insert `CoinTransaction` (e.g. `fromUserId = userId`, `type = GIFT_SENT` or other), then update `UserWallet` (`coinBalance -= amount`, `totalCoinsSpent += amount`).

- **credit(userId, amount, options)**  
  Increases balance by `amount`. Options: `type` (PURCHASE, REFUND, BONUS), `referenceId`, `description`.  
  - In one Prisma transaction: insert `CoinTransaction` (e.g. `toUserId = userId`, `type = PURCHASE`), then update `UserWallet` (`coinBalance += amount`; if type is PURCHASE, also `totalCoinsPurchased += amount`).

All balance-changing operations must go through these methods so that every change is auditable and consistent.

### 2.2 Callers

- **Registration:** In `auth.service`, inside the same transaction as `User.create`, create `UserWallet` with default 0 balance (already implemented).
- **Send gift:** Gift flow (e.g. `gift.service.ts` or API route handler) calls `walletService.debit(senderId, giftCost, { type: 'GIFT_SENT', referenceId: giftTransactionId })`, then creates `GiftTransaction` and ledger entries in the same or a following transaction (prefer single transaction for consistency).
- **Purchase coins (later):** Payment success handler calls `walletService.credit(userId, coins, { type: 'PURCHASE', referenceId: paymentId })`.
- **Refund / bonus (later):** Same pattern via `credit` with appropriate `type` and `referenceId`.

### 2.3 API exposure

- **GET /api/auth/me** (or equivalent) includes the current user’s wallet: at least `coinBalance`, optionally `totalCoinsPurchased` and `totalCoinsSpent`. Front-end never stores “balance” as the only source; it always refetches or gets it from this (or a dedicated wallet) endpoint.
- Optional **GET /api/wallet** that returns the same wallet summary for the authenticated user (convenience or for wallet-specific UI).

---

## 3. Database relationship strategy

### 3.1 Core relation

- **User 1 : 1 UserWallet**  
  - `UserWallet.userId` is unique and references `User.id`.  
  - One user → one row in `UserWallet`.  
  - Index on `userId` for fast lookup by user.

### 3.2 Audit / traceability

- **CoinTransaction** (or equivalent) stores every balance-affecting event:
  - `fromUserId` / `toUserId`: who lost / gained coins (null for “system” e.g. purchase from platform).
  - `type`: e.g. PURCHASE, GIFT_SENT, GIFT_RECEIVED, REFUND, BONUS.
  - `amount`: always positive; meaning of “from” vs “to” indicates debit vs credit.
  - `referenceId` / `videoId` / `description`: optional link to gift transaction, payment, etc.

- **GiftTransaction:** Already stores sender, receiver, video, gift, `coinAmount`, and 70/30 split. It is the reference for “user spent X on a gift”; the wallet debit is tied to it via `referenceId` or by creating the `CoinTransaction` in the same transaction as the `GiftTransaction`.

- **CreatorEarningsLedger / PlatformRevenueLedger:** Record the 70/30 split for creator payouts and platform revenue; they do not replace wallet audit. Wallet audit is `CoinTransaction` (and wallet totals); creator/platform money is in the ledgers.

### 3.3 Query efficiency

- **By user:** Always query wallet by `userId` (indexed). Use `getOrCreateWallet(userId)` so one query (or create) returns the wallet.
- **History:** Query `CoinTransaction` by `fromUserId` or `toUserId` with index; optional index on `createdAt` for “recent activity”.
- **No reliance on counters only:** `coinBalance` and totals are derived from and consistent with transaction history; the service always updates both the wallet row and the transaction row together.

---

## 4. How wallet balance is updated safely

### 4.1 Single transaction

- Every debit or credit runs inside a single Prisma `$transaction(async (tx) => { ... })`.
- Inside the transaction:  
  1. Optional: lock or re-read wallet row (e.g. `tx.userWallet.update` with a condition) to avoid double-spend.  
  2. Insert the audit row (`CoinTransaction`).  
  3. Update `UserWallet` (balance and, if applicable, totalCoinsPurchased / totalCoinsSpent).
- If any step fails, the whole transaction rolls back; no “balance updated but no audit row” or the opposite.

### 4.2 Debit (spend) flow

1. Validate `amount > 0` and user exists.
2. In a transaction:
   - Load wallet (or getOrCreate); fail if `coinBalance < amount`.
   - Insert `CoinTransaction`: `fromUserId = userId`, `toUserId = receiverId or null`, `type = GIFT_SENT`, `amount = amount`, optional `referenceId`, `videoId`, `description`.
   - Update `UserWallet`: `coinBalance -= amount`, `totalCoinsSpent += amount`, `updatedAt = now()`.
3. Return success (and optional new balance). Caller can then create `GiftTransaction` and ledger entries (ideally in the same transaction; if not, ensure idempotency or compensating logic for failures).

### 4.3 Credit (purchase / refund / bonus) flow

1. Validate `amount > 0` and user exists.
2. In a transaction:
   - getOrCreateWallet(userId).
   - Insert `CoinTransaction`: `toUserId = userId`, `fromUserId = null` (or system), `type = PURCHASE | REFUND | BONUS`, `amount = amount`, `referenceId = paymentId or null`.
   - Update `UserWallet`: `coinBalance += amount`; if `type === 'PURCHASE'`, also `totalCoinsPurchased += amount`.
3. Return success and optional new balance.

### 4.4 Concurrency and double-spend

- Prisma transactions provide isolation. Two concurrent debits for the same wallet will be serialized; the second will see the updated (reduced) balance and can fail if insufficient.
- For extra safety, use a conditional update: e.g. `update UserWallet set coinBalance = coinBalance - :amount, totalCoinsSpent = totalCoinsSpent + :amount where userId = :id and coinBalance >= :amount`, then check affected row count and roll back if 0.

### 4.5 No front-end–only values

- Balance is never taken from the client for server logic. The server loads the wallet (or uses a cached value only for display after a recent API response) and applies debit/credit based on server-side rules and stored data.
- After any action that changes balance, the client can refetch `/api/auth/me` or `/api/wallet` to get the new balance.

---

## 5. Summary

| Concern              | Approach |
|----------------------|----------|
| One wallet per user  | Created at registration; getOrCreate in service. |
| Stored fields        | coinBalance, totalCoinsPurchased, totalCoinsSpent. |
| Traceability         | Every change paired with a CoinTransaction (or equivalent) in the same DB transaction. |
| Safe updates         | Debit/credit only via WalletService; single Prisma transaction; optional conditional update for debits. |
| Efficiency           | Index on UserWallet.userId; query by userId only. |
| Front-end            | Never source of truth; balance and totals always from API (e.g. GET /api/auth/me or GET /api/wallet). |

This gives a clear wallet architecture, backend service structure, database strategy, and safe update rules for the BeTalent user wallet.
