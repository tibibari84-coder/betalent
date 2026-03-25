# BeTalent Weekly Global Live Challenge System

## Overview

The Weekly Global Live Challenge is a lifecycle-driven system supporting global participation, multiple regional live windows, timezone-aware scheduling, and explicit winner computation.

## Lifecycle

| Status | Description |
|--------|-------------|
| DRAFT | Not visible; being configured |
| SCHEDULED | Configured; waiting for entry open |
| ENTRY_OPEN | Accepting entries |
| ENTRY_CLOSED | No more entries; live windows upcoming or active |
| LIVE_UPCOMING | Live windows scheduled, none live yet |
| LIVE_ACTIVE | At least one live window is live |
| VOTING_CLOSED | Voting closed; winners not yet locked |
| WINNERS_LOCKED | Winners computed and locked |
| ARCHIVED | Fully complete; historical |

Transitions are driven by **Admin** (`POST /api/admin/challenges/[slug]` with `action`) — manual override and scripted transitions.

## Global Windows

Each challenge can have one or more `ChallengeWindow` records:
- `regionLabel` – e.g. Americas, EMEA, APAC
- `timezone` – IANA timezone (e.g. America/New_York)
- `startsAt`, `endsAt` – UTC timestamps
- `status` – SCHEDULED, LIVE, COMPLETED, CANCELLED

Window status is updated when a linked `LiveChallengeSession` starts/ends.

## Entry Flow

- **Canonical gate**: Video must satisfy `CANONICAL_PUBLIC_VIDEO_WHERE`
- **Max 90s** for standard challenge entry (150s for live slots)
- **Integrity**: `passesOriginalityForChallenge` – **fail-closed**: if no MediaIntegrityAnalysis exists, entry is blocked. Documented behavior: block entry when analysis is missing.
- **One entry per creator per challenge**

## Live Slot System

- Only eligible challenge entries (public video, fairness CLEAN) can become performers
- Slot duration hard-capped at 150s
- Votes/gifts only accepted when slot status is LIVE and session status is LIVE
- Self-vote/self-gift blocked server-side
- Current performer enforced server-side

## Winner Model (Explicit)

| Item | Definition |
|------|------------|
| **What counts toward ranking** | Composite score: Video.score (votes/gifts), engagement, completion proxy, ChallengeVote (stars), LiveVote, LiveGift (coins) |
| **Voting opens** | When challenge is ENTRY_OPEN (entries + voting) |
| **Voting closes** | At `votingCloseAt` (or `endAt`) |
| **When scores lock** | When status transitions to WINNERS_LOCKED |
| **Who can win** | Top 3 creators by final leaderboard score. Entries with fairnessStatus DISQUALIFIED or FROZEN excluded |
| **Tie-break** | Earlier `ChallengeEntry.createdAt` wins |

## Admin APIs

- `POST /api/admin/challenges` – create challenge
- `GET/PATCH/POST /api/admin/challenges/[slug]` – get, update, or transition
- `GET/POST /api/admin/challenges/[slug]/windows` – list or create windows
- `POST /api/live/challenges/[slug]/session` – create live session (admin)
- `POST /api/live/sessions/[sessionId]/admin` – start/next/end (admin)

## Integrity Honesty

**Enforced:**
- Server-side slot state gating
- Authenticated user checks
- Self-vote/self-gift blocking
- Valid performer enforcement
- Time-bounded voting (votingCloseAt)

**Not claimed:**
- True liveness proof
- Lip-sync detection
- AI voice detection
