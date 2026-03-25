# BeTalent Challenge Competition Voting & Ranking System

*Professional talent competition layer. Scoped to challenges only. Main For You feed remains retention-first.*

---

## PART 1 — Product Architecture

BeTalent challenge voting is a **premium competition layer**:

- Creators submit performances to weekly challenges
- Viewers rate challenge entries with **1–5 stars**
- Votes contribute to challenge ranking (not vote-only)
- Challenge ranking combines: votes, retention, support, talent, replay
- Main feed stays separate from competition voting

**Design principles:** fair, premium, anti-abuse, explainable, exciting, mobile-first.

---

## PART 2 — Voting Model

| Aspect | Implementation |
|--------|----------------|
| Scale | 1–5 stars |
| Auth | Logged-in users only |
| Per entry | One vote per user (update allowed) |
| Self-vote | Forbidden (blocked + FraudEvent logged) |
| Context | Challenge/competition only |
| Main feed | No voting UI; votes do not dominate For You |

**Surfaces:** challenge detail page, challenge entry cards, challenge leaderboard, finalist views.

---

## PART 3 — Database Design

### ChallengeVote Model

| Field | Type | Description |
|-------|------|--------------|
| id | String | Primary key (cuid) |
| challengeId | String | FK → Challenge |
| videoId | String | FK → Video |
| voterUserId | String | FK → User (voter) |
| creatorUserId | String | FK → User (entry creator) |
| stars | Int | 1–5 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraints:**
- `@@unique([challengeId, videoId, voterUserId])` — one vote per user per entry
- Self-vote blocked at service layer

**Indexes:**
- `challengeId` — aggregation, leaderboard
- `videoId` — per-video aggregation
- `(challengeId, videoId)` — per-entry aggregation
- `voterUserId` — voter history, anti-abuse
- `(voterUserId, createdAt)` — anti-abuse (recent votes)

### ChallengeEntry (finalist support)

- `isFinalist` (Boolean, default false) — when true, entry is in finalist round

### Aggregates Strategy: **B — Compute on Read**

**Chosen:** Compute summary from `ChallengeVote` with efficient queries.

**Reasoning:**
- Vote data changes frequently; stored aggregates would need constant invalidation
- `groupBy` on indexed `challengeId`/`videoId` is fast
- No extra tables or sync jobs
- Simpler schema and fewer failure modes
- Cache invalidation on vote keeps leaderboard fresh

**Aggregated values (computed):**
- `votesCount` — `COUNT(*)` per video
- `averageStars` — `AVG(stars)` per video
- `weightedVoteScore` — Bayesian formula (see below)
- `normalizedVoteScore` — 0–1 scale: `(weightedVoteScore - 1) / 4`

---

## PART 4 — Anti-Abuse / Fairness

| Protection | Implementation |
|------------|----------------|
| No self-voting | Service check + FraudEvent `CHALLENGE_SELF_VOTE_ATTEMPT` |
| One vote per entry | DB unique constraint; upsert overwrites |
| Rate limit | 60 vote actions per user per hour (DB RateLimit) |
| Small-sample protection | Bayesian weighted score |
| Suspicious-pattern log | Admin debug: voters with ≥10 votes in recent batch |

**Suspicious cases logged:**
- Self-vote attempts → FraudEvent
- Rapid voting from same account → rate limit blocks
- Unnatural clusters → admin debug surfaces high-vote voters

---

## PART 5 — Weighted Vote Score

**Formula (Bayesian prior average):**

```
weightedVoteScore = (priorMean * priorWeight + sum(stars)) / (priorWeight + votesCount)
```

**Constants** (`src/constants/challenge-vote.ts`):
- `priorMean` = 3.5 (neutral)
- `priorWeight` = 10 (equivalent votes)
- `minConfidenceThreshold` = 5 (display/UI)

**Effect:**
- 2 votes at 5.0 → score ≈ 4.4 (pulled toward 3.5)
- 100 votes at 4.8 → score ≈ 4.78 (stable)
- Small samples regress toward prior; large samples dominate.

---

## PART 6 — Challenge Ranking System

**Base score** (no single metric dominates):

```
challengeScore =
  weightedVoteScore * W_vote +
  retentionScore * W_retention +
  supportScore * W_support +
  talentScoreNormalized * W_talent +
  replayQuality * W_replay +
  engagementRatio * W_engagement +
  likes * W_likes
```

**Weights** (`CHALLENGE_RANKING_WEIGHTS` in `src/constants/ranking.ts`):

| Component | Weight | Source |
|-----------|--------|--------|
| starVoteScore | 3 | Bayesian-weighted 1–5 stars |
| superVotes | 2.5 | Coin support |
| giftSupport | 2.5 | Gift coins |
| retentionScore | 2 | completedViews/viewCount (VideoWatchStats) |
| replayQuality | 1 | replayCount (VideoWatchStats) |
| talentScore | 1 | Video.talentScore 0–10 → 0–1 |
| engagementRatio | 1 | (likes+comments)/views |
| likes | 0.3 | Raw likes (weak) |

All components normalized 0–1 over the challenge set before weighting.

**Advanced dynamics** (applied after base score):

1. **Time decay** — older entries lose ranking power: `multiplier = max(0.7, exp(-ageHours / 72))`
2. **Momentum boost** — entries gaining traction: `multiplier = 1 + min(0.15, normalizedMomentum * 0.15)` (votesLast24h + sharesLast24h)
3. **Finalist locking** — when challenge has finalists or status=ENDED, finalists get no decay/momentum (stable ranking)
4. **Creator diversity** — max 2 entries per creator in top 10
5. **Style balance** — max 2 entries per style in top 10 (cover challenges)

`finalScore = baseScore * timeDecayMultiplier * momentumMultiplier`

---

## PART 7 — Finalist / Round System

**Structural support:**

1. **Open entry** — `Challenge.status` OPEN/VOTING; creators submit; public can vote
2. **Ranking** — Leaderboard uses combined `challengeScore`
3. **Finalist** — `ChallengeEntry.isFinalist` marks top N; can drive separate finalist view
4. **Winner selection** — Based on final `challengeScore`; `ChallengeWinner` written when challenge ends

**Future:** Job or admin can set `isFinalist=true` for top N when challenge enters finalist phase.

---

## PART 8 — API Design

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/challenges/[slug]/vote` | Yes | Submit/update vote |
| GET | `/api/challenges/[slug]/votes/summary` | No | Per-entry vote summary |
| GET | `/api/challenges/[slug]/leaderboard` | No | Ranked leaderboard with challengeScore |
| GET | `/api/challenges/[slug]/votes/my-votes` | Yes | Current user's votes |
| GET | `/api/admin/challenges/[slug]/votes-debug` | Admin | Raw votes, breakdown, suspicious |

**Leaderboard response** includes: rank, videoId, title, creator, votesCount, averageStars, weightedVoteScore, normalizedVoteScore, challengeScore, isFinalist.

---

## PART 9 — UI / UX

**Design principles:** elegant, premium, fair, explainable. No cheap poll-style UI.

- Black glass + cherry accent
- 1–5 star input; editorial presentation: "★ 4.5 · 24 ratings"
- User's own rating visible when voted
- Subtle hover (scale 1.05); smooth 200ms transitions
- aria-label: "Challenge judging: rate this performance 1–5 stars"
- Mobile-first, premium competition feel

**Component:** `ChallengeStarVote` (used via `VideoCard` on challenge pages)

---

## PART 10 — Main Feed Relationship

**Option A (implemented):** Challenge votes do **not** directly dominate the main For You feed.

- For You remains retention-first: watch time, support, engagement, freshness
- `voteScore` is a **tiny secondary signal** (weight 0.04) for challenge-tagged videos only
- Confidence-weighted: small samples damped
- `challengeScore` (0.06) in For You is from challenge participation/relevance, not star votes

---

## PART 11 — Admin / Debug

**GET /api/admin/challenges/[slug]/votes-debug** returns:

- Per-entry: votesCount, averageStars, weightedVoteScore, challengeScore
- **Score breakdown:** voteContribution, superVotesContribution, giftSupportContribution, retentionContribution, replayContribution, talentContribution, engagementContribution, likesContribution
- Recent votes (last 200)
- Suspicious voters (≥10 votes in recent batch)
- Self-vote blocked note
- Raw vote list

---

## PART 12 — Performance

- Indexes on `challengeId`, `videoId`, `(challengeId, videoId)`, `voterUserId`, `(voterUserId, createdAt)`
- Aggregation via `groupBy` (no full scans)
- **Vote summary cached 30s** per challenge (`CACHE_TTL.CHALLENGE_VOTE_SUMMARY`)
- Cache invalidated on vote
- Vote summary fetched once per leaderboard request

---

## PART 13 — Documentation

This document. See also:
- `docs/SCOPED-VOTING-SYSTEM-REPORT.md` — implementation report
- `docs/CHALLENGE-VOTING-IMPLEMENTATION-REPORT.md` — original report
