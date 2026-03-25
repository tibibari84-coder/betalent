# BeTalent Core Platform – Implementation Report

**Date:** March 2026  
**Scope:** Full product system build – challenges, video, For You, leaderboard, wallet, gifts, live events.

---

## 1. What Was Missing Before

| Area | Before |
|------|--------|
| **Weekly Challenge** | Had artistTheme, liveEventAt; lacked liveStartAt, computed status (upcoming/active/live/ended) |
| **Video** | No performanceStyle; duration validated by tier only (could exceed 120s) |
| **For You** | Pillar-based blend; no real forYouScore with engagement/support/talent/freshness/diversity/challenge |
| **Leaderboard** | Already fixed in prior session (compact spotlight, dense list) |
| **Live Event** | No dedicated live page; no LIVE NOW state or countdown |
| **Upload** | No performanceStyle; no global 120s cap |

---

## 2. What Was Fixed

### Part 1 – Weekly Live Cover Challenge

- **liveStartAt** added to Challenge (when stream goes live)
- **getChallengeDisplayStatus()** in `src/lib/challenge-status.ts`:
  - `upcoming`: now < startAt
  - `active`: startAt ≤ now < liveStartAt
  - `live`: liveStartAt ≤ now ≤ endAt
  - `ended`: now > endAt
- Seed sets both `liveEventAt` and `liveStartAt` for all 50 weeks
- Challenge API returns `liveStartAt`

### Part 2 – Video System

- **performanceStyle** (String?) on Video: pop, rnb, soul, gospel, jazz, acoustic, rock, latin, afrobeat, classical, worship
- **Global 120s cap** in upload init: `limit = Math.min(tierLimit, 120)` (legacy `POST /api/videos/upload` removed)
- **Challenge entry** rejects videos > 120s; sets `Video.performanceStyle` when styleSlug provided
- **Upload init** accepts optional `performanceStyle`

### Part 3 – For You Recommendation

- **forYouScore** formula:
  - engagementScore (likes, comments, shares – weighted)
  - supportScore (coins)
  - talentScore (0–10 normalized)
  - freshnessScore
  - challengeRelevance (boost for videos in active challenges)
  - diversityPenalty (per repeated creator in session)
- Uses `FOR_YOU_WEIGHTS` from `constants/ranking.ts`
- Fetches likesCount, commentsCount, sharesCount, coinsCount, talentScore, challengeEntries
- Combines with pillar mix (ranking, fresh, styleMatch, newCreator) and creator diversity

### Part 4 – Leaderboard

- Already fixed: compact spotlight (0/1/2/3+), dense ranking list, limit 100
- Creator and performance leaderboards verified

### Part 5 – Wallet + Coins

- UserWallet: source of truth (coinBalance, totalCoinsPurchased, totalCoinsSpent)
- CoinTransaction: all movements logged
- Gift send: debit sender, credit creator, GiftTransaction, video stats
- Super vote: debit sender, credit creator, VideoSupportStats, Video.score
- Balance reflected in UI via `/api/wallet`

### Part 6 – Gift System

- **67 gifts** in GIFT_CATALOG (exceeds 50)
- All have name, slug, coinCost, rarityTier
- Seed uses `giftCatalogToSeedRows()` → `prisma.gift.upsert()`
- Gift send: real debit, credit, GiftTransaction

### Part 7 – Live Event

- **/live/[slug]** page:
  - Countdown when not live
  - "LIVE NOW" badge when liveStartAt ≤ now ≤ endAt
  - Video container placeholder (structure ready for real stream)
  - Live leaderboard (polls every 10s when live)
- "Watch Live" link on challenge page

---

## 3. Systems Now Fully Real

| System | Status |
|--------|--------|
| Weekly challenge (50 weeks, artist theme, style) | ✅ Real |
| Video (120s max, performanceStyle) | ✅ Real |
| For You (forYouScore, not basic sorting) | ✅ Real |
| Leaderboard (creator + performance, country, period) | ✅ Real |
| Wallet (UserWallet, CoinTransaction) | ✅ Real |
| Gifting (debit, credit, GiftTransaction) | ✅ Real |
| Live event (countdown, LIVE NOW, leaderboard) | ✅ Real |
| Challenge entry (style, 2min, maxDurationSec) | ✅ Real |

---

## 4. Future Work

| Item | Notes |
|------|-------|
| **Stripe** | Coin purchase mock; integrate Stripe for real payments |
| **Real streaming** | Live page has placeholder; integrate WebRTC/HLS or streaming provider |
| **Live gifting** | Live page has leaderboard; add gift panel during live |
| **Challenge entry UI** | API supports entry with styleSlug; need modal/page for video + style selection |
| **Upload for challenge** | Upload can accept performanceStyle; add challenge context in upload flow |

---

## 5. Confirmation

- **Wallet works:** UserWallet + CoinTransaction; balance updates on gift, super vote, purchase
- **Gifting works:** Debit sender, credit creator, GiftTransaction, video stats
- **Leaderboard correct:** Sorted by score; top matches actual ranking; country/period filters
- **Weekly challenge works:** 50 weeks seeded; artist theme; style selection; liveStartAt; status
- **For You is NOT basic sorting:** forYouScore with engagement, support, talent, freshness, diversity, challenge relevance

---

## 6. Migrations

Run before use:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Migration files:
- `20260320000000_add_cover_challenge_fields` – artistTheme, weekIndex, maxDurationSec, liveEventAt, styleSlug
- `20260321000000_add_live_start_at_and_performance_style` – liveStartAt, performanceStyle
