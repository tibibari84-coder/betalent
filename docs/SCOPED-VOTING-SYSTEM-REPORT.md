# BeTalent Scoped Voting System — Implementation Report

*Senior Product Architect + Senior Fullstack Engineer + Senior Ranking Engineer*

---

## PART 12 — OUTPUT

### 1. Vote System Added in Scoped Mode

**Yes.** The voting system is implemented in **scoped mode**:

- **1–5 stars** only for challenge entries / competition entries
- **Not** used as a mandatory main-feed interaction
- Appears on: challenge entry cards, challenge detail page, challenge leaderboard, finalist screens
- Does **not** dominate: main For You feed, trending feed, profile grids (non-challenge)

---

### 2. Database Schema / Models Added

**ChallengeVote** model (Prisma):

| Field         | Type     | Description                          |
|---------------|----------|--------------------------------------|
| id            | String   | Primary key (cuid)                   |
| challengeId   | String   | FK → Challenge                       |
| videoId       | String   | FK → Video                           |
| voterUserId   | String   | FK → User (voter)                    |
| creatorUserId | String   | FK → User (entry creator)            |
| stars         | Int      | 1–5                                  |
| createdAt     | DateTime |                                      |
| updatedAt     | DateTime |                                      |

**Constraints:**
- `@@unique([challengeId, videoId, voterUserId])` — one vote per user per entry
- Self-vote blocked at service/API layer (voterUserId ≠ creatorUserId)

**Indexes:**
- `challengeId` — aggregation, leaderboard
- `videoId` — per-video aggregation
- `(challengeId, videoId)` — per-entry aggregation
- `voterUserId` — voter history, anti-abuse
- `(voterUserId, createdAt)` — anti-abuse (recent votes)

**Aggregates strategy: compute on read**

- `votesCount`, `averageStars`, `weightedVoteScore`, `normalizedVoteScore` are **computed** from `ChallengeVote` via `groupBy`
- No stored aggregates on `ChallengeEntry` — keeps schema simple; aggregation is fast via indexes
- `normalizedVoteScore`: 0–1 scale `(weightedVoteScore - 1) / 4` for display/ranking

---

### 3. API Routes Added

| Method | Route                                      | Auth   | Purpose                          |
|--------|--------------------------------------------|--------|----------------------------------|
| POST   | `/api/challenges/[slug]/vote`              | Yes    | Submit or update vote            |
| GET    | `/api/challenges/[slug]/votes/summary`     | No     | Per-entry vote summary           |
| GET    | `/api/challenges/[slug]/votes/my-vote`      | Yes    | Current user's vote for 1 entry  |
| GET    | `/api/challenges/[slug]/votes/my-votes`     | Yes    | Current user's votes (all)       |
| GET    | `/api/admin/challenges/[slug]/votes-debug`  | Admin  | Raw votes, aggregates, suspicious|

**POST /api/challenges/[slug]/vote**
- Body: `{ videoId: string, stars: number }`
- Validates stars 1–5
- Rejects self-vote (403)
- Idempotent: same user + entry = update
- Returns updated `summary` after vote

---

### 4. Anti-Abuse Rules

| Rule                    | Implementation                                      |
|-------------------------|-----------------------------------------------------|
| Self-vote blocked       | Service check + FraudEvent `CHALLENGE_SELF_VOTE_ATTEMPT` |
| One vote per user/entry | DB unique `(challengeId, videoId, voterUserId)`     |
| Rate limit              | 60 vote actions per user per hour (DB RateLimit)   |
| Small-sample protection | Bayesian weighted score (see below)                 |
| Suspicious-pattern log  | Admin debug: voters with ≥10 votes in recent batch  |

---

### 5. Weighted Vote Formula

**Bayesian prior average:**

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

### 6. UI Surfaces Where Voting Appears

| Surface                    | Component           | Behavior                                      |
|---------------------------|---------------------|-----------------------------------------------|
| Challenge entry cards     | `ChallengeStarVote` | 1–5 stars, avg, count; via VideoCard         |
| Challenge detail page      | Via `VideoCard`     | Same as above                                 |
| Challenge leaderboard     | Via `VideoCard`     | Same as above                                 |
| Live challenge page       | Via `VideoCard`     | Same as above                                 |
| Main For You feed         | —                   | No voting UI                                  |
| Trending feed             | —                   | No voting UI                                  |

**Design:** Black-glass + cherry accent (`text-accent`), mobile-first, smooth interaction.

---

### 7. How VoteScore Affects Challenge Ranking

**Challenge ranking** uses a combined formula (`CHALLENGE_RANKING_WEIGHTS`):

| Component       | Weight | Source                          |
|-----------------|--------|---------------------------------|
| starVoteScore   | 3      | Bayesian-weighted 1–5 stars     |
| superVotes      | 2.5    | Coin support                    |
| giftSupport     | 2.5    | Gift coins                      |
| retentionScore  | 2      | completedViews/viewCount       |
| replayQuality   | 1      | replayCount                     |
| talentScore     | 1      | Video.talentScore 0–10 → 0–1   |
| engagementRatio | 1      | (likes+comments)/views          |
| likes           | 0.3    | Raw likes (weak)                |

**Leaderboard ranks by combined challenge score**, not by votes alone.

---

### 8. Main For You Feed

**Vote score is used as a small secondary signal** for challenge videos only:

- `voteScore` weight: **0.04** (vs retention **0.28**)
- Confidence-weighted: `voteScore = avgStars * min(1, voteCount / 10)` — small samples damped
- Does **not** overpower retention, replay, support, or audience behavior
- Main feed remains **retention-first and frictionless**

---

### 9. Leaderboard Integration

Leaderboard entries include:

- `rank`, `title`, `creator`, `votesCount`, `averageStars`, `weightedVoteScore`
- `challengeScore` — combined ranking score
- `isFinalist` — finalist round flag

**Ranks by combined challenge score** (votes + retention + support + talent + replay + engagement).

---

### 10. Debug / Admin

**GET /api/admin/challenges/[slug]/votes-debug** (admin only):

- Per-entry: `votesCount`, `averageStars`, `weightedVoteScore`, `challengeScore`
- **Score breakdown:** voteContribution, superVotesContribution, giftSupportContribution, retentionContribution, replayContribution, talentContribution, engagementContribution, likesContribution
- Recent votes (last 200)
- Suspicious voters (≥10 votes in recent batch)
- Self-vote blocked note
- Raw vote list (videoId, voter, creator, stars, createdAt)

Compatible with existing debug/admin tooling.

---

### 11. Performance

- Indexes on `challengeId`, `videoId`, `(challengeId, videoId)`, `voterUserId`, `(voterUserId, createdAt)`
- Aggregation via `groupBy` (no full scans)
- **Vote summary cached 30s** per challenge (`CACHE_TTL.CHALLENGE_VOTE_SUMMARY`)
- Cache invalidated on vote
- Vote summary fetched once per leaderboard request

---

### 12. Future Work

- [ ] Optional: cache vote summaries per challenge (e.g. 30s TTL) for high-traffic challenges
- [ ] Optional: IP-based suspicious-pattern logging (same-IP voting clusters)
- [ ] Optional: `ChallengeVoteStats` materialized table if aggregation becomes a bottleneck
- [ ] Optional: hide star-vote UI for own entries (creator viewing own card)
- [ ] Optional: challenge-specific full leaderboard page (`/challenges/[slug]/leaderboard`)
