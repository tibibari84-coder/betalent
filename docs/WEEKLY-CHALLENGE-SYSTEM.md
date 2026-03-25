# BeTalent Weekly Challenge System

Challenges let creators compete on a theme; one performance per creator per challenge. Entries are ranked by votes, engagement, and completion rate; top creators get visibility, badges, coins, and rank progress.

---

## 1. Challenge structure

Each challenge has:

| Field | Description |
|-------|-------------|
| **title** | Display name (e.g. "Whitney Houston Week"). |
| **slug** | URL-safe unique id (e.g. `whitney-houston-week`). |
| **category** | Link to `Category` (Music, Dance, etc.) – constrains theme and discovery. |
| **description** | Subtitle / brief (theme, what to perform). |
| **time_window** | `startAt`, `endAt` – submission and/or voting window. |
| **prize** | Human-readable prize description; optional structured `prizeCoins` for top places. |
| **rules** | List of rules (one performance per creator, upload limit, original content, theme). |

**Lifecycle:** `DRAFT` → `OPEN` (accepting entries) → `VOTING` (entry closed, voting only) → `ENDED`. Configurable in schema and admin.

---

## 2. User participation

- **One performance per creator per challenge.** Enforced by unique `(challengeId, creatorId)` on `ChallengeEntry`.
- **Submission:** Creator submits an existing or new **Video** as their entry. The video must:
  - **Follow challenge theme** (category/theme check at submit or moderation).
  - **Respect upload limit** (creator’s tier-based `uploadLimitSec`).
  - Be **original content** (policy; no lip-sync/fake playback – see rules).
- Entry is a link: `ChallengeEntry` = `(challengeId, creatorId, videoId)`. Same video can only be used once per challenge.

---

## 3. Challenge ranking

Entries are ranked by a **composite score** derived from the entry’s video:

| Signal | Source | Weight (configurable) |
|--------|--------|------------------------|
| **votes** | `Video.score` (gifts/leaderboard) | Primary |
| **engagement** | `(likesCount + commentsCount) / max(viewsCount, 1)` | Primary |
| **completion rate** | Proxy: engagement or future watch-time data | Secondary |

Ranking is computed when the leaderboard is requested (or cached). Order: highest composite score first. Weights live in `src/constants/challenge.ts`.

---

## 4. Winners

Top creators (e.g. top 3 or top 10) receive:

| Reward | Implementation |
|--------|----------------|
| **Visibility boost** | Entry video `isFeatured` or challenge-specific spotlight in feeds. |
| **Profile badge** | `ChallengeWinner` record; badge asset/key per challenge or "Top 3 Weekly". |
| **Coin rewards** | `CoinTransaction` type `BONUS` crediting winner’s wallet; amount from challenge `prizeCoins` or config. |
| **Rank progress** | Feed into talent-ranking (e.g. challenge wins count toward tier progression). |

Winner records: `ChallengeWinner(challengeId, creatorId, rank, coinsAwarded)` written when challenge ends (cron or admin action).

---

## 5. Data model (summary)

- **Challenge** – title, slug, categoryId, description, startAt, endAt, status, prizeDescription, prizeCoins (optional), rules (JSON array).
- **ChallengeEntry** – challengeId, creatorId, videoId; unique (challengeId, creatorId).
- **ChallengeWinner** – challengeId, creatorId, rank, coinsAwarded, createdAt.

Video and User stay as-is; no required change to existing upload flow except to optionally set `challengeId` on upload or link a video to a challenge when creating an entry.

---

## 6. Code locations

- **Constants / weights:** `src/constants/challenge.ts`
- **Types:** `src/types/challenge.ts`
- **Service:** `src/services/challenge.service.ts` (create entry, get leaderboard, get challenge by slug)
- **API:** `GET /api/challenges`, `GET /api/challenges/[slug]`, `POST /api/challenges/[slug]/enter`, `GET /api/challenges/[slug]/leaderboard`

---

## 7. Rules (example)

- One performance per creator per challenge.
- Maximum duration = creator’s upload limit (tier-based).
- Performance must match the challenge theme (artist, style, or topic).
- Original content; no lip-sync or fake playback.
- Covers must be performed by the creator.

Stored in `Challenge.rules` (e.g. JSON array of strings) and shown on the challenge page.

### Policy tokens (integrity enforcement in code)
To make originality/integrity enforcement deterministic in the backend, add explicit policy tokens to `Challenge.rules`.

Use string tokens in the format:
- `POLICY:<ORIGINALITY_POLICY_VALUE>`

Examples:
- `POLICY:LIP_SYNC_PROHIBITED`
- `POLICY:DUPLICATE_REPOSTS_PROHIBITED`
