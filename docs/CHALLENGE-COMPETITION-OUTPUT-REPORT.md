# BeTalent Challenge Competition Voting — Output Report (PART 14)

*Senior Product Architect + Senior Fullstack Engineer + Senior Ranking Engineer + Senior Competition Systems Designer*

---

## 1. Database Models Added/Changed

**ChallengeVote** (Prisma):

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

**Constraints:** `@@unique([challengeId, videoId, voterUserId])`

**Indexes:** challengeId, videoId, (challengeId, videoId), voterUserId, (voterUserId, createdAt)

**ChallengeEntry:** `isFinalist` (Boolean) — supports finalist round

---

## 2. API Routes Added

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/challenges/[slug]/vote` | Yes | Submit or update vote |
| GET | `/api/challenges/[slug]/votes/summary` | No | Per-entry vote summary |
| GET | `/api/challenges/[slug]/leaderboard` | No | Ranked leaderboard |
| GET | `/api/challenges/[slug]/votes/my-vote` | Yes | User's vote for 1 entry |
| GET | `/api/challenges/[slug]/votes/my-votes` | Yes | User's votes (all) |
| GET | `/api/admin/challenges/[slug]/votes-debug` | Admin | Raw votes, breakdown, suspicious |

---

## 3. Anti-Abuse Protections

| Protection | Implementation |
|------------|----------------|
| No self-voting | Service check + FraudEvent `CHALLENGE_SELF_VOTE_ATTEMPT` |
| One voter → one vote per entry | DB unique constraint; upsert overwrites |
| Rate limit | 60 vote actions per user per hour (DB RateLimit) |
| Suspicious-pattern log | Admin debug: voters with ≥10 votes in recent batch |
| Small-sample protection | Bayesian weighted score |

---

## 4. Weighted Vote Score Formula

**Bayesian prior average:**

```
weightedVoteScore = (priorMean * priorWeight + sum(stars)) / (priorWeight + votesCount)
```

**Constants:** priorMean = 3.5, priorWeight = 10

**Effect:** 2 votes at 5.0 ≈ 4.4; 100 votes at 4.8 ≈ 4.78

---

## 5. Challenge Ranking Formula

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

All components normalized 0–1 over the challenge set. No single metric dominates.

---

## 6. UI Surfaces Added

| Surface | Component | Behavior |
|---------|-----------|----------|
| Challenge entry cards | ChallengeStarVote (via VideoCard) | 1–5 stars, avg, count |
| Challenge detail page | Via VideoCard | Same |
| Challenge leaderboard | Via VideoCard | Same |
| Live challenge page | Via VideoCard | Same |
| Main For You feed | — | No voting UI |
| Trending feed | — | No voting UI |

**Design:** Black glass + cherry accent, mobile-first.

---

## 7. Leaderboard Logic

- Ranks by **combined challenge score** (votes + retention + support + talent + replay + engagement)
- Returns: rank, videoId, title, creator, votesCount, averageStars, weightedVoteScore, normalizedVoteScore, challengeScore, isFinalist
- Vote summary cached 30s; invalidated on vote

---

## 8. Whether Votes Affect Main Feed or Not

**Vote score is a small secondary signal** for challenge videos only:

- `voteScore` weight: **0.04** (vs retention **0.28**)
- Confidence-weighted: small samples damped
- Main feed remains **retention-first and frictionless**

---

## 9. Debug/Admin Additions

**GET /api/admin/challenges/[slug]/votes-debug:**

- Per-entry: votesCount, averageStars, weightedVoteScore, challengeScore
- Score breakdown: voteContribution, superVotesContribution, giftSupportContribution, retentionContribution, replayContribution, talentContribution, engagementContribution, likesContribution
- Recent votes (last 200)
- Suspicious voters (≥10 votes)
- Self-vote blocked note
- Raw vote list

---

## 10. Remaining Future Improvements

- [ ] Optional: IP-based suspicious-pattern logging (same-IP voting clusters)
- [ ] Optional: `ChallengeVoteStats` materialized table if aggregation becomes a bottleneck
- [ ] Optional: hide star-vote UI for own entries (creator viewing own card)
- [ ] Optional: challenge-specific full leaderboard page (`/challenges/[slug]/leaderboard`)
- [ ] Optional: Redis cache for multi-instance deployments
