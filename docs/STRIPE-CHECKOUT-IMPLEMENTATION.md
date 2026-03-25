# Stripe Test Mode — Coin Purchase (Checkout)

*Stripe Checkout redirect flow. TEST mode only. No card details stored.*

---

## 1. Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/coins/purchase` | POST | Create order + Stripe Checkout Session; returns `redirectUrl` |
| `POST /api/webhooks/stripe` | POST | Webhook: `checkout.session.completed` → fulfill order, credit wallet |

---

## 2. Payment Flow

1. User selects coin package on `/wallet`
2. `POST /api/coins/purchase` with `{ packageId }`
3. API creates `CoinPurchaseOrder` (PENDING), creates Stripe Checkout Session, stores `session.id` as `providerReferenceId`
4. API returns `{ ok: true, redirectUrl }`
5. Client redirects to Stripe Checkout (`window.location.href = redirectUrl`)
6. User pays on Stripe hosted page (test card: 4242 4242 4242 4242)
7. Stripe redirects to `/wallet?redirect_status=succeeded` (success) or `/wallet?redirect_status=cancelled` (cancel)
8. Webhook `checkout.session.completed` fires → `fulfillOrderByProviderRef('STRIPE', session.id)` → credit wallet, set order COMPLETED

---

## 3. Wallet Update (Idempotent)

On `checkout.session.completed`:

1. Find `CoinPurchaseOrder` by `providerReferenceId = session.id`
2. `fulfillOrder(orderId)`:
   - If `status === 'COMPLETED'` → return (no double-credit)
   - Else: `wallet.service.credit(userId, coins, { type: 'PURCHASE', referenceId: orderId })`
   - Creates `CoinTransaction` with `type: PURCHASE`
   - Updates `UserWallet` (`coinBalance`, `totalCoinsPurchased`)
   - Sets `CoinPurchaseOrder.status = 'COMPLETED'`, `completedAt = now`

---

## 4. Database

| Table | Behavior |
|-------|----------|
| `CoinPurchaseOrder` | Created PENDING; `providerReferenceId` = Stripe `session.id`; COMPLETED when webhook fulfills |
| `CoinTransaction` | Created by `wallet.service.credit()` with `type: PURCHASE` |
| `UserWallet` | `coinBalance`, `totalCoinsPurchased` updated by `credit()` |

---

## 5. Security

- **Keys:** `STRIPE_SECRET_KEY` (sk_test_...), `STRIPE_WEBHOOK_SECRET` (whsec_...)
- **No card storage:** Stripe handles all payment data; we never see card details
- **Verification:** Webhook verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`
- **Test mode only:** Live keys (sk_live_, pk_live_) are rejected

---

## 6. Env Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (server) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for webhook verification |
| `NEXT_PUBLIC_APP_URL` | Optional; success/cancel redirect base (default: localhost or VERCEL_URL) |

---

## 7. Testing End-to-End

1. **Stripe Dashboard (Test mode):**
   - https://dashboard.stripe.com/test/apikeys
   - Copy Secret key (`sk_test_...`)

2. **Webhook (local):**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Use the CLI's `whsec_...` for `STRIPE_WEBHOOK_SECRET`.

3. **Stripe Dashboard webhook (production):**
   - https://dashboard.stripe.com/test/webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Event: `checkout.session.completed`

4. **Purchase flow:**
   - Log in, go to `/wallet`
   - Click a coin package
   - Redirects to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
   - Complete payment → redirect to `/wallet` with success message
   - Webhook credits wallet; transaction history shows PURCHASE

5. **Verification:**
   - Balance increases
   - Transaction list shows "Purchased Coins"
   - `CoinPurchaseOrder` has `status: COMPLETED`
   - `CoinTransaction` with `type: PURCHASE` exists
