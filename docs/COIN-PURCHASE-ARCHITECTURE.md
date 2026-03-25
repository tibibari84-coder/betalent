# BeTalent Coin Purchase Architecture

## Overview

The coin purchase system is built so that **wallet logic** and **payment provider logic** are cleanly separated. Real payment providers (Stripe, PayPal) can be added later without rewriting the coin economy.

- **Coin packages** – Already exist; define price, coins, validity.
- **Wallet** – Already exists; credits and debits only via `wallet.service` (no client-trusted accounting).
- **Purchase flow** – Create an order (PENDING) → provider creates intent → when provider confirms payment, we **fulfill** the order (credit wallet). Wallet is never credited on “create”; only on **fulfill**.

## Layers

### 1. Wallet layer (unchanged by provider)

- **Location:** `src/services/wallet.service.ts`
- **Responsibilities:** `credit()`, `debit()`, `getOrCreateWallet()`, `getBalance()`. All accounting goes through here. `credit()` with `type: 'PURCHASE'` and `referenceId: orderId` is the only way purchase adds coins.
- **Rule:** Wallet never trusts the client. Credit happens only when our backend calls `credit()` after a **completed** purchase order (e.g. after provider webhook).

### 2. Purchase order (record of intent)

- **Model:** `CoinPurchaseOrder` (Prisma)
  - `userId`, `coinPackageId`, `coins` (to credit), `amountCents`, `currency`
  - `status`: PENDING | COMPLETED | FAILED | REFUNDED
  - `provider`: MOCK | STRIPE | PAYPAL
  - `providerReferenceId` (e.g. Stripe `payment_intent.id`)
  - `createdAt`, `completedAt`
- **Purpose:** Represents “user wants to buy this package.” Becomes the single source of truth for “how many coins to credit” when we fulfill. No double-credit: fulfill is idempotent (already COMPLETED → no-op).

### 3. Purchase flow (order + intent, no wallet yet)

- **Location:** `src/services/coin-purchase.service.ts`
- **createOrder(userId, packageId, createIntent):**
  1. Validate package (exists, active, valid window).
  2. Create `CoinPurchaseOrder` with status PENDING, provider (e.g. MOCK).
  3. Call **provider** `createIntent(params)` → returns `{ orderId, status, clientSecret?, redirectUrl?, message? }`.
  4. Return orderId + intent to client. **No wallet credit.**

- **fulfillOrder(orderId):** (internal; called when payment is confirmed)
  1. Load order; if not PENDING, return (idempotent for COMPLETED).
  2. `wallet.service.credit(userId, order.coins, { type: 'PURCHASE', referenceId: order.id })`.
  3. Update order to COMPLETED, set `completedAt`.

- **fulfillOrderByProviderRef(provider, providerReferenceId):** Find order by provider + providerReferenceId, then `fulfillOrder(order.id)`. Used by **webhooks** (e.g. Stripe sends `payment_intent.succeeded` with `payment_intent.id` → we call this).

### 4. Payment provider abstraction

- **Types:** `src/types/payment.ts`
  - `PurchaseIntentResult`: orderId, status, clientSecret?, redirectUrl?, message?
  - `CreatePurchaseIntentFn`: `(params) => Promise<PurchaseIntentResult>`
- **Current:** `src/services/payment-providers/mock-provider.ts` – returns PENDING + message; no real payment.
- **Future Stripe:** New file e.g. `stripe-provider.ts`:
  - Implement `CreatePurchaseIntentFn`: create Stripe PaymentIntent, store `payment_intent.id` on order as `providerReferenceId`, return `clientSecret`.
  - Webhook handler (e.g. `POST /api/webhooks/stripe`): on `payment_intent.succeeded`, call `fulfillOrderByProviderRef('STRIPE', payment_intent.id)`.

No wallet logic lives in the provider. Provider only creates intents and (via webhook) triggers fulfill.

## API (current)

- **POST /api/coins/purchase**  
  Body: `{ packageId }`. Creates order (PENDING), runs mock provider, returns `{ ok, orderId, status, intent }`. No coins credited.

## Adding Stripe (later) without rewriting the economy

1. **Implement Stripe provider**
   - Create `src/services/payment-providers/stripe-provider.ts`.
   - Implement `CreatePurchaseIntentFn`: create Stripe PaymentIntent with amount (order.amountCents), currency; update `CoinPurchaseOrder` with `provider: 'STRIPE'`, `providerReferenceId: payment_intent.id`; return `{ orderId, status: 'PENDING', clientSecret: payment_intent.client_secret }`.

2. **Use Stripe in create flow**
   - In `POST /api/coins/purchase` (or a variant), call `createOrder(userId, packageId, createStripePurchaseIntent)` instead of `createMockPurchaseIntent`. Client receives `clientSecret` and can confirm payment on the front end (Stripe.js).

3. **Webhook to fulfill**
   - Add `POST /api/webhooks/stripe`. Verify signature; on `payment_intent.succeeded`, read `payment_intent.id`, call `fulfillOrderByProviderRef('STRIPE', payment_intent.id)`. Wallet is credited here; no change to wallet.service or coin-purchase.service fulfill logic.

4. **Optional: store providerReferenceId in createIntent**
   - Today the mock doesn’t update the order. Stripe provider will: after creating the PaymentIntent, update `CoinPurchaseOrder` with `providerReferenceId` so the webhook can find the order. Order is already created in `createOrder` before the provider is called; provider only adds the external id.

Result: wallet and coin economy stay as-is; only the provider implementation and one webhook route are added.
