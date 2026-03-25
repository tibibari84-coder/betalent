# For You Ranking V2 — ML-Style Design

TikTok-level multi-stage ranking using weighted signals and structured scoring. No real ML yet; simulation via explicit formulas for explainability and future extension.

---

## 1. Multi-Stage Pipeline

| Stage | Name | Purpose | Where |
|-------|------|---------|-------|
| **1** | Candidate generation | Bucket-based retrieval (retention, support, engagement, fresh, challenge, rising, personalized, exploration) | `candidates.service.ts` |
| **2** | Lightweight scoring | Fast filter using only Video fields (no watchStats, no affinity). O(1) per candidate. | `lightweight-scoring.service.ts` |
| **3** | Final ranking | Full feature extraction + primary scoring. Runs only on top N from Stage 2. | `features.service.ts` + `scoring.service.ts` |

**Flow:** Candidates → Lightweight score all → Sort → Take top 400 → Full score only those 400 → Assemble feed.

---

## 2. Signals and Where They Are Computed

### Stage 2 (Lightweight) — `lightweight-scoring.service.ts`

Uses only fields available on `Video` (no joins, no watchStats):

| Signal | Source | Normalization |
|--------|--------|---------------|
| Engagement | likes, comments, shares, sharesLast24h | Per-candidate max across pool |
| Support | coins / views | Min(1, coinPerView × 10) |
| Growth | sharesLast24h | Normalized by max sharesLast24h |
| Freshness | upload time | Half-life decay: `0.5^(ageHours/24)` |

### Stage 3 (Full) — `features.service.ts` + `scoring.service.ts`

| Group | Signals | Where computed |
|-------|---------|----------------|
| **Retention** | completion rate, avg watch time, replay rate, skip rate | `features.service.ts` (from watchStats) |
| **Engagement** | like rate, comment rate, share rate, share velocity | `features.service.ts` |
| **Growth** | follower growth proxy (creatorFollowersCount normalized) | `features.service.ts` |
| **Support** | gift coins per view, vote rate | `features.service.ts` |
| **Personalization** | category match, creator match, style match | `features.service.ts` (from UserAffinity) |
| **Freshness** | age hours, half-life decay | `scoring.service.ts` |
| **Safety** | moderation penalty, report rate | `features.service.ts` |

---

## 3. Half-Life Decay

- **Formula:** `decay = 0.5^(ageHours / 24)` — score influence halves every 24h.
- **Counterbalance:** Strong retention, support, or engagement can reduce decay:
  ```
  counterbalance = min(1, 0.4×retention + 0.35×support + 0.25×engagement)
  freshnessMult = max(0.1, min(1, decay + (1 - decay) × counterbalance))
  ```
- **Floor:** 0.1 minimum to avoid total collapse of old content.

Constants: `FOR_YOU_HALFLIFE_HOURS`, `FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS`, `FRESHNESS_FLOOR` in `ranking.ts`.

---

## 4. Exploration (20% Anti-Filter-Bubble)

- **Split:** 80% personalized / 20% exploration (`FOR_YOU_PERSONALIZED_SHARE`, `FOR_YOU_EXPLORATION_SHARE`).
- **Exploration mix:** rising 30%, fresh 30%, challenge 25%, other 15% (`FOR_YOU_EXPLORATION_MIX`).
- **Random share:** 30% of exploration slots are truly random (`FOR_YOU_EXPLORATION_RANDOM_SHARE`) — ~6% of total feed.

---

## 5. Personalization (Without Overfitting)

- **Affinity signals:** category match, creator match, style match, contentType affinity.
- **Weights:** `personalizationAffinity` = 12% of final score.
- **Penalties:** skip penalty for negative categories; down-rank watched videos (×0.5).
- **Diversity:** max 2 videos per creator per feed; challenge share capped at 40%.

---

## 6. Final Scoring Formula

### Base score (Stage 3)

```
baseScore =
  retentionQuality × 0.28 +
  engagementQuality × 0.22 +
  supportQuality × 0.20 +
  personalizationAffinity × 0.12 +
  freshnessAdjusted × 0.08 +
  creatorQuality × 0.06 +
  challengeRelevance × 0.06 -
  safetyPenalty × 0.15
```

### Component formulas

```
retentionQuality =
  completionRate × 0.5 +
  averageWatchSecondsPerView × 0.3 +
  (1 - skipRate) × 0.2 +
  min(0.1, replayRate × 2)

engagementQuality =
  likeRate × 0.32 +
  commentRate × 0.28 +
  shareRate × 0.18 +
  shareVelocity × 0.14 +
  followerGrowthProxy × 0.08

supportQuality = giftCoinsPerView × 0.6 + voteRate × 0.4

personalizationAffinity =
  categoryMatch × 0.35 +
  creatorMatch × 0.30 +
  styleMatch × 0.25 +
  contentTypeAffinity × 0.10

freshnessAdjusted = halfLifeDecay(ageHours, retention, support, engagement)

creatorQuality = talentScore × 0.5 + creatorQualityScore × 0.5

safetyPenalty = moderationPenalty × 0.5 + reportRate × 0.5
```

### Final score

```
score = max(0, baseScore) × newUploadBoost × creatorBoost × earlyDistMultiplier
```

- **newUploadBoost:** 1.25 for videos ≤24h old.
- **creatorBoost:** 1.2 for creators with ≤3 uploads.
- **earlyDistMultiplier:** from early distribution (seeding / boost / suppress).

---

## 7. Stage 2 Lightweight Formula

```
score =
  engagement × 0.35 +
  support × 0.30 +
  growth × 0.15 +
  freshness × 0.20
```

Where:
- `engagement` = likeRate×0.4 + commentRate×0.35 + shareRate×0.15 + shareVelocity×0.1
- `support` = min(1, coinPerView × 10)
- `growth` = shareVelocity
- `freshness` = max(0.1, 0.5^(ageHours/24))

---

## 8. How to Extend to Real ML

1. **Feature store:** All `VideoFeatures` are already structured. Log them with labels (watch time, completion, skip, like, share) for training.
2. **Replace weights:** Swap `V2_SCORING_WEIGHTS` and component sub-weights with learned parameters (e.g. linear model, small NN).
3. **Stage 2 → learned ranker:** Train a lightweight model (e.g. XGBoost, small neural net) on Stage 2 features; keep Stage 1 and Stage 3 structure.
4. **Stage 3 → full model:** Replace `computePrimaryScore` with a learned ranker; keep feature extraction as-is.
5. **Online learning:** Use A/B tests to compare hand-tuned vs learned weights; iterate on feature engineering before heavy model investment.
6. **Calibration:** Ensure learned scores stay in a similar range to current scores for downstream logic (early distribution, exploration mix).

---

## 9. Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `LIGHTWEIGHT_SCORE_CAP` | 400 | Top N from Stage 2 proceed to Stage 3 |
| `LIGHTWEIGHT_HALFLIFE_HOURS` | 24 | Half-life for Stage 2 freshness |
| `FOR_YOU_HALFLIFE_HOURS` | 24 | Half-life for Stage 3 decay |
| `FOR_YOU_EXPLORATION_RANDOM_SHARE` | 0.3 | 30% of exploration = random |
| `FOR_YOU_NEW_UPLOAD_BOOST_HOURS` | 24 | Boost window for new uploads |
| `FOR_YOU_NEW_UPLOAD_BOOST` | 0.25 | +25% for new uploads |
