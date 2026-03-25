# BeTalent — Staging test execution sheet (MVP pre-launch)

**Environment:** Staging  
**Date:** _______________  
**Executed by:** _______________  
**Build / commit:** _______________

Instructions: Run steps **in order**. Mark **Pass** or **Fail**. If **Fail**, note ticket / blocker in **Notes**.

---

## Section A — Build & install

| # | Step (execution order) | Expected result | Fail if… | Pass | Fail | Notes |
|---|------------------------|-----------------|----------|:----:|:----:|-------|
| A1 | On a clean machine or CI: `rm -rf node_modules && npm ci` | Install completes without errors | Install errors or missing `postinstall` / Prisma failure | ☐ | ☐ | |
| A2 | `npx prisma generate` (if not already run by postinstall) | Completes with “Generated Prisma Client” | Error or no client generated | ☐ | ☐ | |
| A3 | `npx tsc --noEmit` | Exit code **0** | Any TS error reported | ☐ | ☐ | |
| A4 | `npm run build` | Next.js build **finishes successfully** | Build error or non-zero exit | ☐ | ☐ | |
| A5 | `npm run start` (or host start command) | Server listens; HTTP 200 on base URL | App won’t start or base URL errors | ☐ | ☐ | |

---

## Section B — Environment variables (staging)

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| B1 | Confirm **`DATABASE_URL`** points at **staging** DB only | App connects; migrations can run | Wrong DB, connection refused, or prod URL by mistake | ☐ | ☐ | |
| B2 | Confirm **`SESSION_SECRET`** set, ≥32 chars, not dev default | Login/session works in production mode | Missing, short, or known default in staging | ☐ | ☐ | |
| B3 | Confirm **`NODE_ENV=production`** on staging host (if mirroring prod) | Secure cookie behavior as intended | Cookies broken or wrong security flags | ☐ | ☐ | |
| B4 | Confirm **R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `POST /api/upload/init` does **not** return 503 “not configured” | 503 on upload init or presign errors | ☐ | ☐ | |
| B5 | Confirm **`R2_PUBLIC_URL`** if playback depends on public CDN | Videos play after upload | Broken playback URLs | ☐ | ☐ | |
| B6 | Confirm **Stripe test:** `STRIPE_SECRET_KEY` (`sk_test_…`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (`whsec_…`) | Checkout + webhook path configurable | Missing keys or mode mismatch | ☐ | ☐ | |
| B7 | Confirm **`NEXT_PUBLIC_APP_URL`** matches staging URL | Redirects after checkout land on staging | Wrong host / broken return URL | ☐ | ☐ | |

---

## Section C — Database

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| C1 | Run **`npx prisma migrate deploy`** against staging DB | All pending migrations apply | Error or drift vs schema | ☐ | ☐ | |
| C2 | Smoke: create user or seed data visible in DB | Expected rows exist | Core tables inaccessible | ☐ | ☐ | |

---

## Section D — Payments, wallet, gifts (staging, test mode)

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| D1 | Log in as **User A** (buyer). Open **`/wallet`**. | Balance and UI load; no 500 in network tab | Error page, empty wallet API error | ☐ | ☐ | |
| D2 | Start coin **purchase** → complete Stripe **test** checkout. | Redirect back; **balance increases** | No credit, duplicate credit, or stuck checkout | ☐ | ☐ | |
| D3 | In Stripe Dashboard: webhook **`checkout.session.completed`** for this payment shows **2xx** | Delivery success | 4xx/5xx or missing event | ☐ | ☐ | |
| D4 | **Replay** same webhook (or pay again with idempotency in mind). | **No double credit** for same logical purchase | Balance jumps incorrectly | ☐ | ☐ | |
| D5 | As **User A**, send **gift** to a video owned by **User B**. | Gift succeeds; balances/rules match product spec | Error, wrong debit/credit, or negative balance | ☐ | ☐ | |
| D6 | **Daily bonus** (if in scope): claim once, then try again same window. | Second claim **rejected** as designed | Double claim | ☐ | ☐ | |

---

## Section E — Upload & media

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| E1 | Log in as creator. Open **`/upload`**, select allowed video file, submit flow. | Init → PUT to presigned URL → complete succeeds | 4xx/5xx or stuck in UPLOADING | ☐ | ☐ | |
| E2 | Open new video on site. | Playback works; thumbnail if expected | Broken URL or player error | ☐ | ☐ | |
| E3 | **`DELETE /api/videos/{id}`** with **no** session cookie. | **401** + safe JSON body | Delete proceeds or 2xx | ☐ | ☐ | |
| E4 | **`DELETE`** another user’s video while logged in as **non-owner non-admin**. | **403** | Delete succeeds | ☐ | ☐ | |
| E5 | **`DELETE`** own video as **owner** (or as **admin** for that id). | **200** (or documented error only after authz); storage/DB consistent | Unauthorized delete or orphan behavior | ☐ | ☐ | |

---

## Section F — Mobile QA (devices)

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| F1 | **iOS Safari:** log in, open feed, scroll. | Usable; no hard crash | Crash or blank feed | ☐ | ☐ | |
| F2 | **iOS Safari:** upload flow (file pick). | Can complete or clear failure message | Broken picker or silent failure | ☐ | ☐ | |
| F3 | **Android Chrome:** same as F1–F2. | Same expectations | Same fail conditions | ☐ | ☐ | |
| F4 | Check **keyboard / bottom nav** on login + upload. | CTAs visible; forms usable | Obscured buttons or stuck focus | ☐ | ☐ | |

---

## Section G — Moderation & security

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| G1 | Open **`/moderation`** logged **out**. | Redirect to **login** | Page fully usable without auth | ☐ | ☐ | |
| G2 | Open **`/admin`** (any subpath) logged **out**. | Redirect to **login** | Admin UI exposed | ☐ | ☐ | |
| G3 | Log in as **non-admin**; call one **admin API** (e.g. moderation action). | **403** / forbidden | Action succeeds | ☐ | ☐ | |
| G4 | Submit **content report** (if UI exists). | Request accepted; appears in queue or DB | 500 or silent drop | ☐ | ☐ | |
| G5 | **Logout**; hit **`/wallet`**. | Redirect to login | Wallet data visible | ☐ | ☐ | |

---

## Section H — Ops

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| H1 | Document: backup / restore contact for staging DB | Written down | No owner for data loss | ☐ | ☐ | |

---

## Section I — Sign-off

| # | Step | Expected result | Fail if… | Pass | Fail | Notes |
|---|------|-----------------|----------|:----:|:----:|-------|
| I1 | All **critical** sections **A–E** and **G1–G3**, **H1** are **Pass** | Ready for go/no-go | Any critical step Fail | ☐ | ☐ | |
| I2 | **Product owner go / no-go** recorded | Decision documented | Launch without decision | ☐ | ☐ | |

**Overall staging result:** ☐ **PASS**  ☐ **FAIL** (blockers: _________________________________)

**Sign-off:** _________________________ **Date:** _________________________
