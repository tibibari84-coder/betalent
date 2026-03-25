# BeTalent Coin Package System

**Design · Purchasable bundles · No payment processing in scope**

---

## 1. Purpose

- **Coin packages** are the only way users acquire coins (real money → coins). This document defines the package **model** and **internal logic**; payment provider integration is out of scope.
- Packages are **purchasable bundles** with a displayed price, displayed coin amount, and optional bonus/promo behaviour. The system is designed so that a future payment flow can: list packages, resolve a package by id or internal name, compute the coin amount to credit, and record the purchase.

---

## 2. Package Model (Data)

Each package has:

| Field | Purpose |
|-------|--------|
| **Internal name** | Unique, stable identifier for code and APIs (e.g. `package_100`). Used when mapping payment product IDs or for idempotency. |
| **Display name** | Shown in UI (e.g. "100 Coins"). |
| **Displayed price** | Amount and currency shown to the user (e.g. 0.99 USD). Stored as decimal + currency. |
| **Displayed coin amount** | Base coins shown (e.g. 100). This is the "face value" of the package. |
| **Status** | `active` / `inactive`. Only active packages are listed for purchase. |
| **Ordering position** | Integer `sortOrder`; lower = higher in the list. Used for consistent store ordering. |

**Future-ready fields (optional):**

| Field | Purpose |
|-------|--------|
| **Bonus coins** | Optional extra coins (e.g. "500 + 50 bonus"). Total credited = base coins + bonus coins. Display can show "500 + 50 bonus" or "550 coins". |
| **Valid from / Valid until** | Optional time window. When set, the package is only considered available within this range (for limited-time offers). |
| **Is promotional** | Flag for promo packages. Enables filtering (e.g. "Promos" section) and reporting without changing core purchase logic. |

**Payment integration (later):**

- No payment fields on the package model for MVP. When integrating a provider (e.g. Stripe):
  - Store **product/price IDs** on the package (e.g. `stripeProductId`, `stripePriceId`) or in a separate config table keyed by package id.
  - Use **internal name** or package id to map webhook events to the correct package and coin amount.

---

## 3. MVP Example Packages

| Internal name   | Display name | Coins | Price (USD) | Sort |
|-----------------|--------------|-------|-------------|------|
| `package_100`   | 100 Coins    | 100   | 0.99        | 1    |
| `package_500`   | 500 Coins    | 500   | 4.99        | 2    |
| `package_1000`  | 1000 Coins   | 1000  | 9.99        | 3    |
| `package_5000`  | 5000 Coins   | 5000  | 39.99       | 4    |

All MVP packages: **active**, **no bonus**, **no date window**, **not promotional**. Prices are placeholder until real pricing and payment are defined.

---

## 4. How the System Supports Promos and Limited-Time Offers

- **Promotional packages**  
  - Use the same model; set `isPromotional = true` and optionally `bonusCoins`.  
  - List endpoints can filter by `isPromotional` or merge into one list with a "promo" badge.  
  - Credited amount = base `coins` + `bonusCoins` (if set).

- **Bonus coins**  
  - Set `bonusCoins` on the package. When a purchase is completed (in future payment flow), credit `coins + bonusCoins` to the user’s wallet.  
  - Display logic can show "500 + 50 bonus" and internal logic uses one total for the wallet credit.

- **Limited-time offers**  
  - Set `validFrom` and/or `validUntil`.  
  - **Listing:** only include packages where "now" is within `[validFrom, validUntil]` (treat null as no bound).  
  - **Purchase:** when the payment is confirmed, re-check the window (and active status) before crediting; reject if the offer has expired.

---

## 5. Internal Logic (No Payment Yet)

- **List packages**  
  - Return packages that are **active** and **currently valid** (optional validity window).  
  - Order by `sortOrder` (asc).  
  - Response includes: id, internalName, name, price, currency, coins, bonusCoins (if any), effective total coins, isPromotional, validFrom, validUntil.

- **Get package by id or internal name**  
  - For a future checkout or webhook: resolve package by `id` or `internalName`, then compute **effective coins** = `coins + (bonusCoins ?? 0)` and check active + validity window before crediting.

- **Effective coins**  
  - Single place: `effectiveCoins = base coins + (bonusCoins ?? 0)`. All wallet credits for a purchase use this value.

- **No payment processing**  
  - No charges, no webhooks. When payment is added: create a purchase record, call `walletService.credit(userId, effectiveCoins, { type: 'PURCHASE', referenceId: purchaseId })`, and optionally link the purchase to the package id for analytics.

---

## 6. Database and Service Summary

- **Schema:** `CoinPackage` with: internalName (unique), name, coins, price, currency, isActive, sortOrder; optional bonusCoins, validFrom, validUntil, isPromotional, updatedAt.
- **Service:** `coin-package.service.ts`: `listActive()`, `getById(id)`, `getByInternalName(internalName)`, `getEffectiveCoins(package)`, `isCurrentlyValid(package)`.
- **API:** `GET /api/coin-packages` returns active, currently valid packages ordered by sortOrder (for store UI). No purchase or payment endpoints in this phase.

**Migration:** If you have existing `CoinPackage` rows from an older schema, add a migration that backfills `internalName` (e.g. `package_legacy_` + id) and `sortOrder` (e.g. 0) before adding the new columns. Then run `npx prisma migrate dev` (or `db push` in dev).
