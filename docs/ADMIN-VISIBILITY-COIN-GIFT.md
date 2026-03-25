# BeTalent Admin Visibility Layer: Coin & Gift System

## Purpose

Read-only visibility for admins to inspect the coin and gift economy: packages, catalog, transaction logs, creator earnings, risk signals, high-volume supporters, and platform revenue. No dashboard UI in scope; architecture and API surface only.

## Access Control

- **Guard:** `requireAdmin()` in `src/lib/auth.ts`. Ensures session user exists and `role === 'ADMIN'`.
- **Session:** `SessionUser.role` is set at login (`src/app/api/auth/login/route.ts`). Admin routes must call `requireAdmin()` before any visibility logic.
- **Responses:** 401 Unauthorized when not logged in; 403 Forbidden when not admin.

## Visibility Requirements & Data Sources

| Requirement | Description | Data source | API |
|-------------|-------------|-------------|-----|
| **Coin packages** | Inspect all packages (active + inactive), validity windows, pricing | `CoinPackage` | `GET /api/admin/coin-gift/packages` |
| **Gift catalog** | Inspect all gifts (active + inactive), cost, rarity | `Gift` | `GET /api/admin/coin-gift/catalog` |
| **Gift transaction logs** | Paginated logs with sender, receiver, video, gift, amounts | `GiftTransaction` + relations | `GET /api/admin/coin-gift/transactions` |
| **Creator earnings summaries** | Per-creator earnings cache (available, total, gift count, pending) | `CreatorEarningsSummary` + creator | `GET /api/admin/coin-gift/earnings` |
| **Suspicious gifting behavior** | Heuristics: large single tx, high sender→receiver frequency, burst activity | `GiftTransaction` (in-memory scan) | `GET /api/admin/coin-gift/suspicious` |
| **High-volume supporters** | Users ranked by total coins sent | `User.totalCoinsSpent` | `GET /api/admin/coin-gift/supporters` |
| **Platform revenue from gifts** | Sum of platform share from gift transactions | `PlatformRevenueLedger` (sourceType = GIFT_TRANSACTION) | `GET /api/admin/coin-gift/revenue` |
| **Gift abuse flags** | Persisted anti-abuse flags for moderation | `GiftAbuseFlag` | `GET /api/admin/coin-gift/abuse-flags` |

## Internal Architecture

### Layer 1: Types

- **File:** `src/types/admin-visibility.ts`
- **Contents:** DTOs for each view (e.g. `AdminCoinPackageView`, `AdminGiftTransactionLogEntry`, `AdminSuspiciousGiftingFlag`). All fields serializable; dates as ISO strings.

### Layer 2: Service (read-only)

- **File:** `src/services/admin-visibility.service.ts`
- **Functions:**
  - `listCoinPackagesAdmin()` → all coin packages
  - `listGiftCatalogAdmin()` → all gifts
  - `getGiftTransactionLogs(options)` → paginated logs (cursor, since/until, senderId/receiverId)
  - `getCreatorEarningsSummaries(options)` → earnings rows (limit, minEarnings)
  - `getSuspiciousGiftingFlags(options)` → flags (since, thresholds for large tx, pair frequency, burst)
  - `getHighVolumeSupporters(options)` → users by totalCoinsSpent (limit, minCoinsSpent)
  - `getPlatformRevenueFromGifts(options)` → totals (optional since/until for period)
- **Principle:** No mutations; no direct use of session. Service is pure data access; auth is in the API layer.

### Layer 3: API routes

- **Prefix:** `src/app/api/admin/coin-gift/`
- **Routes:** One GET per visibility area (packages, catalog, transactions, earnings, suspicious, supporters, revenue). Each calls `requireAdmin()` then the corresponding service function and returns JSON.
- **Query params:** Documented per route (e.g. transactions: limit, cursor, since, until, senderId, receiverId; revenue: since, until).

## Suspicious Gifting Heuristics

- **large_single_transaction:** Single gift ≥ threshold (default 5000 coins). Configurable via `largeTransactionMinCoins`.
- **high_frequency_pair:** Same sender → same receiver, count ≥ N in the inspected window (default 5). Configurable via `highFrequencyMinCount`, `since`.
- **burst_activity:** Same sender, many transactions in the window (default 10). Configurable via `burstMinCount`, `since`.

All flags are derived from `GiftTransaction` in the `since` window (default last 7 days). No persistent risk state; recomputed on each request. For production, consider moving to materialized flags or a dedicated risk job.

## Scalability Notes

- **Transaction logs:** Paginated (limit max 100); cursor-based. Use `since`/`until` to restrict time range and avoid full table scans.
- **Suspicious:** Loads all transactions in `since` into memory. For very large volumes, restrict `since` or replace with DB aggregates / batch job.
- **Revenue:** Single aggregate over `PlatformRevenueLedger`; indexed by sourceType and createdAt.
- **Earnings / supporters:** Single ordered query with limit; indexed.

## Future Dashboard

When building an admin dashboard, call the above GET endpoints from authenticated admin-only pages. No new visibility logic required; add only UI and optionally caching (e.g. short TTL for revenue/summaries).
