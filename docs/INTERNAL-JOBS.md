# Internal maintenance jobs (no Vercel Cron)

Scheduled HTTP crons were removed for Hobby-compatible deploys. Background work is **not** executed automatically unless you wire an external scheduler.

## Jobs implemented

| Job name | What it does |
|----------|----------------|
| `talent_ranking` | Recomputes creator tiers, `VideoRankingStats`, etc. (`runTalentRankingJob`) |
| `challenge_lifecycle` | Timestamp-based challenge status transitions (`runChallengeLifecycleJob`) |
| `share_velocity` | Resets and recomputes `Video.sharesLast24h` from `ShareEvent` (last 24h) |

**Not implemented as a batch job:** R2/orphan storage sweeps beyond per-video delete (`deleteVideoStorageObjects` on video delete). There is no standalone “storage cleanup” runner.

## How to run

### A) Admin UI session (browser)

- Log in as **ADMIN**.
- `POST /api/admin/jobs/run` with JSON body `{ "job": "talent_ranking" }` (or `challenge_lifecycle`, `share_velocity`).
- Same-origin `fetch` with credentials; CSRF not required for JSON API (cookie session).

### B) External scheduler (GitHub Actions, VM cron, etc.)

1. Set Vercel env **`INTERNAL_JOB_RUNNER_SECRET`** (≥ 16 characters).
2. `POST https://<your-domain>/api/internal/jobs/run`  
   Header: `Authorization: Bearer <INTERNAL_JOB_RUNNER_SECRET>`  
   (or `x-internal-job-secret: <INTERNAL_JOB_RUNNER_SECRET>`)  
   Body: `{ "job": "talent_ranking" }` etc.

### C) Direct script (recommended for large DBs / Hobby timeouts)

```bash
export DATABASE_URL="postgresql://…neon…"
npx tsx scripts/run-maintenance-job.ts talent_ranking
```

Use the same for `challenge_lifecycle` and `share_velocity`.

**Hobby note:** Serverless HTTP triggers may hit **execution time limits**; the script path uses your machine/CI timeout instead.

## Automation status

- **Manual or external-only:** You must schedule A, B, or C yourself. The app does not self-schedule these jobs.
