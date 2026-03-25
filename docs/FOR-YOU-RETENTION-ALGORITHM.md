# For You Retention Algorithm

High-retention "For You" feed for BeTalent. MVP design: simple, effective, scalable.

## Core Signals (Weighted)

| Signal | Weight | Source |
|--------|--------|--------|
| **Watch time** | 40% | `UserWatchInteraction.completedPct` – % watched (≥70% = positive, <20% = negative) |
| **Likes** | 20% | `Like` – positive signal |
| **Comments** | 20% | `Comment` – stronger than likes |
| **Follows** | 10% | `Follow` – very strong (via creator preference) |
| **Skip rate** | -10% | Fast scroll (<20% watched) → negative signal |

## User Preference Model

- **Preferred categories**: from likes + high-completion watches (≥70%)
- **Negative categories**: from fast skips (<20%)
- **Liked creators**: from `Like` + `Follow`

## Feed Generation Flow

1. **Fetch candidates**: engagement, support, freshness pillars (union of 3 queries)
2. **Remove / down-rank**: already watched (×0.5 penalty)
3. **Score each video**:
   - Base: engagement, support, talent, freshness, challenge
   - + Completion boost: category user completed (≥70%)
   - − Skip penalty: category user skipped (<20%)
   - × Watched penalty: 0.5 if already watched
4. **Sort** by score DESC
5. **Exploration**: 15% slots from shuffled unseen candidates

## Cold Start (New User)

- No `userId` → no personalization
- Show: trending + high-quality + mixed categories
- Same pillars, no watch/like penalties

## Real-Time Learning

Signals updated when user:

- **Watches video** → `POST /api/watch-progress` (on scroll away)
- **Likes** → `Like` table
- **Comments** → `Comment` table
- **Follows** → `Follow` table

## Watch Tracking

- **Start**: when video becomes active
- **End**: when user scrolls away (`isActive` → false)
- **Recorded**: `watchTimeSec`, `completedPct` (0–1)
- **≥70%** → positive signal (boost similar categories)
- **<20%** → negative signal (down-rank similar categories)

## API

- `GET /api/feed/for-you?limit=30&creatorIds=...` – ranked videos
- `POST /api/watch-progress` – record watch (auth required)

## Anti-Spam

- Max 3 videos per creator per feed
- No back-to-back same creator
- Watched videos down-ranked (not excluded)

## DB Changes

- `UserWatchInteraction`: userId, videoId, watchTimeSec, completedPct, isRewatch, lastWatchedAt
