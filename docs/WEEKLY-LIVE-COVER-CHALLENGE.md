# Weekly Live Cover Challenge System

## Overview

Each week has one **platform-chosen artist theme**. Users perform covers from that artist and **choose their performance style** (Pop, R&B, Soul, Gospel, Jazz, etc.). Max performance length: **90 seconds** (standard); live slots up to **150 seconds**.

## Schema

### Challenge (extended)

| Field | Type | Description |
|-------|------|-------------|
| `artistTheme` | String? | Platform-chosen artist (e.g. "Michael Jackson") |
| `weekIndex` | Int? | 1–50 for preplanned sequence |
| `maxDurationSec` | Int | Default 90 (standard); up to 150 for live slots |
| `liveEventAt` | DateTime? | When the weekly live show happens (countdown) |

### ChallengeEntry (extended)

| Field | Type | Description |
|-------|------|-------------|
| `styleSlug` | String? | User-chosen style (pop, rnb, soul, gospel, jazz, etc.) |

## API

### Enter challenge

```
POST /api/challenges/[slug]/enter
Body: { videoId: string, styleSlug: string }  // styleSlug required for cover challenges
```

- `VIDEO_TOO_LONG`: Video exceeds `maxDurationSec` (90 or challenge-specific)
- `STYLE_REQUIRED`: Cover challenge but no styleSlug provided

### Challenge detail

```
GET /api/challenges/[slug]
```

Returns `artistTheme`, `maxDurationSec`, `liveEventAt`, `availableStyles` (for cover challenges).

## Constants

- **COVER_CHALLENGE_STYLES** (`src/constants/cover-challenge.ts`): Pop, R&B, Soul, Gospel, Jazz, Acoustic, Rock, Latin, Afrobeat, Classical, Worship
- **WEEKLY_ARTIST_THEMES**: 50 preplanned artists (Michael Jackson, Whitney Houston, … Global Divas Finale)

## Seed

Run `npx prisma migrate deploy` then `npx prisma db seed` to create:

1. **Cover** category
2. **50 Weekly Live Cover Challenges** with artist themes, week indices, start/end dates, live event times

Week 1 = OPEN, weeks 2–50 = DRAFT. First week starts March 9, 2026.

## Pages

- **/challenges** – List all challenges (current week highlighted)
- **/challenges/[slug]** – Challenge detail with artist theme, countdown, live event, leaderboard, style display

## Flow

1. User uploads a video (max 2 min when for cover challenge)
2. User goes to challenge page, clicks "Submit Entry"
3. User selects video + style, calls `POST /api/challenges/[slug]/enter` with `{ videoId, styleSlug }`
4. Entry appears on leaderboard with style
