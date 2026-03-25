# BeTalent Challenge Competition Voting System — Implementation Report

*Professional talent competition layer. Scoped to challenges only. Main For You feed remains retention-first.*

---

## 1. Scoped Mode

**Yes.** The vote system was added in scoped mode:

- **1–5 stars** only for challenge entries / competition entries
- **Not** used in the main For You feed
- Appears on: challenge entry cards, challenge detail page, challenge leaderboard, finalist screens
- Does **not** appear on: main For You feed, trending feed, profile grids (non-challenge)

---

## 2. Database Schema

### ChallengeVote Model

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

### ChallengeEntry (finalist support)

- `isFinalist` (Boolean, default false) — marks entry as finalist round

### Aggregates Strategy: B — Compute on Read

**Computed on read** (not stored):
- `votesCount` — `COUNT(*)` per video
- `averageStars` — `AVG(stars)` per video
- `weightedVoteScore` — Bayesian formula (see below)

No `ChallengeEntry` or `ChallengeVoteStats` table for aggregates. Keeps schema simple; aggregation is fast via `groupBy` and indexes.

---

## 3. API Routes

| Method | Route                                      | Auth   | Purpose                          |
|--------|--------------------------------------------|--------|----------------------------------|
| POST   | `/api/challenges/[slug]/vote`              | Yes    | Submit or update vote            |
| GET    | `/api/challenges/[slug]/votes/summary`     | No     | Per-entry vote summary           |
| GET    | `/api/challenges/[slug]/votes/my-vote`     | Yes    | Current user's vote for 1 entry  |
| GET    | `/api/challenges/[slug]/votes/my-votes`    | Yes    | Current user's votes (all)       |
| GET    | `/api/admin/challenges/[slug]/votes-debug` | Admin  | Raw votes, aggregates, suspicious|

### POST /api/challenges/[slug]/vote

- Body: `{ videoId: string, stars: number }`
- Validates stars 1–5
- Rejects self-vote (403)
- Idempotent: same user + entry = update
- Returns updated `summary` after vote

---

## 4. Anti-Abuse Rules

| Rule                    | Implementation                                      |
|-------------------------|-----------------------------------------------------|
| Self-vote blocked       | Service check + FraudEvent `CHALLENGE_SELF_VOTE_ATTEMPT` |
| One vote per user/entry| DB unique `(challengeId, videoId, voterUserId)`     |
| Rate limit              | 60 vote actions per user per hour (DB RateLimit)   |
| Small-sample protection | Bayesian weighted score (see below)                 |
| Suspicious-pattern log  | Admin debug: voters with ≥10 votes in recent batch  |

---

## 5. Weighted Vote Formula

**Bayesian prior average:**

```
weightedVoteScore = (priorAvg * priorWeight + sum(stars)) / (priorWeight + votesCount)
```

- `priorMean` = 3.5 (neutral)
- `priorWeight` = 10 (equivalent votes)
- `minConfidenceThreshold` = 5 (display/UI)

**Effect:**
- 2 votes at 5.0 → score ≈ 4.4 (pulled toward 3.5)
- 100 votes at 4.8 → score ≈ 4.78 (stable)
- Small samples are regressed toward the prior; large samples dominate.

---

## 6. UI Surfaces

| Surface                    | Component           | Behavior                                      |
|---------------------------|---------------------|-----------------------------------------------|
| Challenge entry cards     | `ChallengeStarVote` | 1–5 stars, avg, count; replaces talent VoteButton |
| Challenge detail page      | Via `VideoCard`     | Same as above                                 |
| Challenge leaderboard      | Via `VideoCard`     | Same as above                                 |
| Main For You feed         | —                   | No voting UI                                  |
| Trending feed              | —                   | No voting UI                                  |

**Design:** Black-glass + cherry accent (`text-accent`), mobile-first, smooth interaction.

---

## 7. Challenge Ranking

**Combined formula** (no single metric dominates):

```
challengeScore =
  starVoteScore * 3 +
  superVotes * 2.5 +
  giftSupport * 2.5 +
  retentionScore * 2 +
  replayQuality * 1 +
  talentScore * 1 +
  engagementRatio * 1 +
  likes * 0.3
```

Weights (`CHALLENGE_RANKING_WEIGHTS`):

- starVoteScore: 3
- superVotes: 2.5
- giftSupport: 2.5
- retentionScore: 2 (from VideoWatchStats)
- replayQuality: 1 (replayCount)
- talentScore: 1 (Video.talentScore 0–10)
- engagementRatio: 1
- likes: 0.3

Leaderboard ranks by **combined challenge score**, not by votes alone.

---

## 8. For You Feed

**Vote score is not used in the main For You feed.**

- For You remains retention-first: watch time, support, engagement, freshness, etc.
- `ChallengeVote` is not queried for For You candidates
- `challengeScore` (0.06) in For You is from challenge participation/relevance, not star votes

---

## 9. Leaderboard Integration

Leaderboard entries now include:

- `votesCount`, `averageStars`, `weightedVoteScore` — vote metrics
- `challengeScore` — combined ranking score
- `isFinalist` — finalist round flag

Ranks by **combined challenge score** (votes + retention + support + talent + replay + engagement).

---

## 10. Admin / Debug

**GET /api/admin/challenges/[slug]/votes-debug** (admin only):

- Per-entry: `votesCount`, `averageStars`, `weightedVoteScore`, `challengeScore`
- **Score breakdown:** voteContribution, superVotesContribution, giftSupportContribution, retentionContribution, replayContribution, talentContribution, engagementContribution, likesContribution
- Recent votes (last 200)
- Suspicious voters (≥10 votes in recent batch)
- Self-vote blocked note
- Raw vote list (videoId, voter, creator, stars, createdAt)

---

## 11. Performance

- Indexes on `challengeId`, `videoId`, `(challengeId, videoId)`, `voterUserId`
- Aggregation via `groupBy` (no full scans)
- Vote summary fetched once per leaderboard request
- No caching of vote summaries (acceptable for challenge page load)

---

## 12. Future Work

- [ ] Optional: cache vote summaries per challenge (e.g. 30s TTL) for high-traffic challenges
- [ ] Optional: IP-based suspicious-pattern logging (same-IP voting clusters)
- [ ] Optional: `ChallengeVoteStats` materialized table if aggregation becomes a bottleneck
- [ ] Optional: hide star-vote UI for own entries (creator viewing own card)
