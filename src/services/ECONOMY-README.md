# BeTalent economy services

Internal coin, gift, earnings, and counter system. Single transaction per gift; no client-trusted accounting.

**Docs:** See `docs/ECONOMY-INTEGRATION.md` for the full module map, audit flow, and APIs. See `docs/COIN-AND-GIFT-ECONOMY.md` for product and domain rules.

**Core flow:** `gift.service.sendGift()` runs in one DB transaction: idempotency → validate → anti-abuse → debit (wallet) → GiftTransaction → revenue split (70/30) → CreatorEarningsLedger + Summary → PlatformRevenueLedger → video + creator counters → abuse flags if needed → idempotency save.

| Service | Role |
|---------|------|
| wallet.service | Balance: credit/debit only. Used by gift (debit) and purchase fulfillment (credit). |
| revenue-split.service | 70% creator / 30% platform. Used by gift.service only. |
| gift.service | Send gift: single tx, all writes. |
| gift-anti-abuse.service | Idempotency, rate limit, duplicate check, abuse flags. Called inside gift tx. |
| coin-package.service | Coin packages (store). |
| coin-purchase.service | Purchase order create/fulfill. Placeholder provider; no real payment. |
| creator-earnings.service | Read creator earnings (ledger-derived). |
| creator-monetization.service | Creator monetization summary + weekly leaderboard. |
| creator-top-supporters.service | Top supporters per creator. |
| video-gift-summary.service | Video-level gift summary + recent + top supporters. |
| support-leaderboard.service | Top supported creators, top supporters, most gifted performances. |

Payment providers live under `payment-providers/`; wallet and gift logic do not depend on a specific provider.
