# Stripe Coin Purchase — Implementation Report

*Real Stripe Test Mode purchase flow. Mock provider removed.*

---

## 1. Stripe Mode and Flow

**Mode:** TEST only. Live keys (`sk_live_`, `pk_live_`) are rejected.

**Flow:** Payment Intent + Stripe Elements (embedded form).

- **Why Payment Intent (not Checkout):** Keeps the purchase flow in-app with the existing black glass + cherry UI. Checkout would redirect to Stripe’s hosted page. Payment Intent with Elements keeps the modal in BeTalent and matches the current UX.
- **Flow:** User selects package → `POST /api/coins/purchase` → create order + PaymentIntent → return `clientSecret` → Stripe Elements modal → user pays → Stripe redirects to `/wallet?redirect_status=succeeded` → webhook `payment_intent.succeeded` → fulfill order → credit wallet.

---

## 2. Routes and Files

### Added

| File | Purpose |
|------|---------|
| `.env.example` | Stripe env vars and webhook setup notes |

### Changed

| File | Changes |
|------|---------|
| `src/app/api/coins/purchase/route.ts` | Removed mock fallback; require Stripe; return 503 when not configured |
| `src/services/payment-providers/stripe-provider.ts` | Enforce `sk_test_`; reject `sk_live_` |
| `src/app/api/webhooks/stripe/route.ts` | Enforce `sk_test_`; reject `sk_live_` |
| `src/components/wallet/StripePaymentModal.tsx` | Enforce `pk_test_`; update copy; clearer test card hint |
| `src/app/(protected)/wallet/page.tsx` | Success message; handle `STRIPE_NOT_CONFIGURED`; remove mock branch |

### Unchanged (Mock Deprecated)

| File | Status |
|------|--------|
| `src/services/payment-providers/mock-provider.ts` | No longer used; can be removed later |

---

## 3. How Successful Purchase Credits the Wallet

1. **Webhook:** Stripe sends `payment_intent.succeeded` to `POST /api/webhooks/stripe`.
2. **Webhook handler:** Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
3. **Event:** Reads `payment_intent.id` from the event.
4. **Fulfill:** `fulfillOrderByProviderRef('STRIPE', payment_intent.id)`:
   - Finds `CoinPurchaseOrder` by `providerReferenceId` (Stripe `pi_xxx`).
   - Calls `fulfillOrder(orderId)`:
     - If `order.status === 'COMPLETED'` → return (idempotent).
     - Otherwise: `wallet.service.credit(userId, order.coins, { type: 'PURCHASE', referenceId: order.id })`.
     - Creates `CoinTransaction` with `type: PURCHASE`, `amount: coins`, `toUserId: userId`.
     - Updates `UserWallet` (`coinBalance`, `totalCoinsPurchased`).
     - Sets `CoinPurchaseOrder.status = 'COMPLETED'`, `completedAt = now`.

5. **Idempotency:** Repeated webhooks for the same `payment_intent.id` hit the same order; `fulfillOrder` sees `COMPLETED` and returns without re-crediting.

---

## 4. Database Behavior

| Table | Behavior |
|-------|----------|
| `CoinPurchaseOrder` | Created when `POST /api/coins/purchase` (PENDING). Updated to COMPLETED with `completedAt` when webhook fulfills. |
| `CoinTransaction` | Created by `wallet.service.credit()` with `type: PURCHASE`, `amount`, `toUserId`. |
| `UserWallet` | `coinBalance` and `totalCoinsPurchased` updated by `credit()`. |

---

## 5. Required Env Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (server). Must start with `sk_test_`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (client). Must start with `pk_test_`. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for webhook signature verification. |

---

## 6. Testing End-to-End in Test Mode

1. **Stripe Dashboard (Test mode):**
   - https://dashboard.stripe.com/test/apikeys
   - Copy Secret key (`sk_test_...`) and Publishable key (`pk_test_...`).

2. **Webhook:**
   - https://dashboard.stripe.com/test/webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe` (or localhost via Stripe CLI).
   - Event: `payment_intent.succeeded`.
   - Copy Webhook signing secret (`whsec_...`).

3. **Local webhook testing:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Use the CLI’s `whsec_...` for `STRIPE_WEBHOOK_SECRET`.

4. **Purchase flow:**
   - Log in as a user.
   - Go to `/wallet`.
   - Click a coin package.
   - Stripe modal opens.
   - Use test card: `4242 4242 4242 4242`, any future expiry, any CVC.
   - Submit payment.
   - Redirect to `/wallet` with success message.
   - Webhook runs → wallet credits → transaction history shows PURCHASE.

5. **Verification:**
   - Balance increases.
   - Transaction list shows “Purchased Coins”.
   - `CoinPurchaseOrder` has `status: COMPLETED`.
   - `CoinTransaction` with `type: PURCHASE` exists.
