# BeTalent Talent Ranking System

The ranking system assigns **creator levels** (tiers) based on algorithmic performance. Progression is **automatic only** (no manual promotion).

## Outputs (User fields)

| Field | Description |
|-------|-------------|
| `user.creatorTier` | Enum: STARTER, RISING, FEATURED, SPOTLIGHT, GLOBAL |
| `user.rankProgress` | Float 0.0–1.0, progress toward next tier |
| `user.rankUpdatedAt` | Last time tier/progress was recomputed |
| `user.uploadLimitSec` | Max video length in seconds (set by tier) |
| `user.totalVotes` | Sum of `Video.score` across creator's videos (cached by job) |

**Badge:** The rank badge shown in the UI is derived from `creatorTier` via `TALENT_TIER_LABELS` (e.g. "Rising Talent").

## Talent levels

1. **Starter Talent** – Default for new creators  
2. **Rising Talent** – First progression  
3. **Featured Talent** – Strong engagement  
4. **Spotlight Talent** – Top performers  
5. **Global Talent** – Reserved for top global performers  

## Data signals used

The algorithm uses:

- **Total votes** – Sum of `Video.score` (leaderboard/super-vote score)
- **Total views, likes, comments** – From `User` aggregates
- **Followers** – `User.followersCount`
- **Performances count** – `User.videosCount` (uploaded, READY videos)
- **Viral performances** – Count of videos with `viewsCount >= 10_000` or `score >= 2_000`
- **Engagement ratio** – `(likes + comments) / views`
- **Completion rate** – When watch-time data exists; otherwise default 50%

## Level requirements (thresholds)

Defined in `src/constants/talent-ranking.ts`.

### Starter → Rising

- Min 5 performances  
- Min 500 total views  
- Min 100 total votes  
- Completion rate > 40%  

### Rising → Featured

- Min 20 performances  
- Min 10,000 views  
- Min 2,000 votes  
- Min 500 followers  
- Completion rate > 50%  

### Featured → Spotlight

- Min 100,000 views  
- Min 20,000 votes  
- Min 3 viral performances  
- Engagement ratio ≥ 5%  

### Spotlight → Global

- Min 1,000,000 views  
- Min 100,000 votes  
- Min 10 viral performances  
- Engagement ratio ≥ 4%  

## Upload limits by tier

| Tier | Upload limit (seconds) |
|------|------------------------|
| Starter | 90 |
| Rising | 90 |
| Featured | 90 |
| Spotlight | 150 |
| Global | 150 |

## System rules

- **Daily job** – Run automatically (e.g. cron) to recompute tier and progress for all users.
- **Badges** – Profile and discovery surfaces use `creatorTier` (via `TALENT_TIER_LABELS`) for badge text.
- **Discovery** – Higher tiers can be weighted more in discovery/feeds (implementation in feed/explore services).
- **Upload limits** – `uploadLimitSec` is updated by the job; enforce in upload API.

## Running the job

### Cron (production)

Call daily, e.g.:

```bash
curl -X POST "https://your-domain.com/api/cron/rank-talents" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
# or
curl -X POST "https://your-domain.com/api/cron/rank-talents" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Set `CRON_SECRET` in your environment (**required**). If it is missing or empty, all cron routes return **500** with an explicit error and **no job runs** (fail closed). Wrong or missing credentials when the secret is set → **401**.

### Manual (dev)

```bash
curl -X POST http://localhost:3000/api/cron/rank-talents \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Code locations

- **Constants / thresholds:** `src/constants/talent-ranking.ts`  
- **Algorithm & job:** `src/services/talent-ranking.service.ts`  
- **Cron route:** `src/app/api/cron/rank-talents/route.ts`  
- **Schema:** `prisma/schema.prisma` – `CreatorTier` enum, `User.rankProgress`, `User.rankUpdatedAt`, `User.totalVotes`  

## Migration

After extending `CreatorTier` and adding `rankProgress`, `rankUpdatedAt`, `totalVotes`:

```bash
npx prisma migrate dev --name add_talent_ranking_fields
```

Existing users keep `creatorTier` (STARTER or RISING); the first job run will recompute and may promote them if they meet the new thresholds.
