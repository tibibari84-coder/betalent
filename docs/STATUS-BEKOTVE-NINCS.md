# BeTalent – Mi van bekötve, mi nincs (állapotáttekintés)

**Cél:** Egyértelmű lista arról, hogy mely funkciók valódi backenddel/API-val működnek, és melyek még UI / placeholder / hiányzó implementációk. ChatGPT vagy más AI/fejlesztő számára.

---

## 1. BE KÖTVE (működik, valódi adat / API)

### Auth
- **Regisztráció** – `POST /api/auth/register`, Prisma User + bcrypt, session
- **Bejelentkezés** – `POST /api/auth/login`, jelszó ellenőrzés, iron-session
- **Kijelentkezés** – `POST /api/auth/logout`
- **Session / “Ki vagyok?”** – `GET /api/auth/me`, session alapján

### Profil / felhasználó
- **Nyelv (locale)** – `PATCH /api/users/me` (preferredLocale), DB + session frissül
- **Profil API** – `GET /api/profile/[username]` – profile.service (getProfileByUsername, getProfileVideos, monetization)
- **Követés (follow)** – `POST /api/follow`, `DELETE /api/follow` – FollowButton a profil oldalon és a Performance modálban bekötve

### Videók
- **Főoldal** – Prisma: featured + trending READY videók, valódi adat
- **Feed “For You”** – `GET /api/feed/for-you` – ranking.service (getForYouFeedRanked), valódi videók
- **Trending oldal** – Server component: `prisma.video.findMany` READY + APPROVED, viewsCount szerint
- **Explore oldal** – Server component: trending, new voices, rails – mind Prisma, valódi adat
- **Videó részletek** – `/video/[id]`: getVideoById, getRelatedVideos, getVideoUserState (video.service)
- **Saját videók** – `GET /api/videos/me` – My Videos oldal fetch-el
- **Videó lekérés** – `GET /api/videos/[id]`, `GET /api/videos/[id]/user-state`
- **Nézet szám** – `POST /api/videos/[id]/view`
- **Like** – `POST /api/likes/toggle` – Performance modálban bekötve
- **Szavazás (vote)** – `POST /api/videos/[id]/vote` (1–10)
- **Super vote** – `POST /api/videos/[id]/super-vote` – wallet, creator credit
- **Kapcsolódó (creator)** – `GET /api/videos/[id]/related-by-creator`

### Upload
- **Direct upload (fájl)** – Ha R2/S3 be van állítva: `POST /api/upload/init` → presigned URL → client PUT → `POST /api/videos/upload/complete`
- **Kategória / duration / méret** – validálva, uploadLimitSec (tier) szerint
- **Feldolgozási pipeline** – Video: processingStatus, moderationStatus; internal webhook-ok az audio analysishez

### Kommentek
- **Új komment / válasz** – **`POST /api/comment`** (videoId, body, opcionális parentId) – CommentsPanel és videó oldal. *Legacy:* `POST /api/comments/create` ugyanazt a domain logikát futtatja (`createCommentOnVideo`), de **deprecated** (Deprecation + Sunset fejlécek).

### Wallet / pénzügy
- **Wallet** – `GET /api/wallet`, wallet oldal, Performance modál
- **Tranzakciók** – `GET /api/wallet/transactions`
- **Coin csomagok** – `GET /api/coin-packages`
- **Ajándék küldés** – `POST /api/gifts/send`
- **Ajándék lista** – `GET /api/gifts`
- **Napi bónusz** – `POST /api/wallet/daily-bonus`
- **Vásárlás (coin)** – `POST /api/coins/purchase` – **placeholder**: nincs valódi fizetés, “Payment integration coming soon” üzenet

### Creator / earnings
- **Payouts** – `GET /api/creators/me/payouts`
- **Payout readiness** – `GET /api/creators/me/payout-readiness`
- **Verification** – `GET /api/creators/verification/me`, `POST /api/creators/verification/request`

### Moderation (admin)
- **Queues** – `GET /api/moderation/queues`
- **Detail** – `GET /api/moderation/detail`
- **Actions** – `POST /api/moderation/actions`
- **Logs** – `GET /api/moderation/logs`
- **Audit** – `GET /api/moderation/audit`
- **Notes** – `POST /api/moderation/notes`
- Moderation oldal ezekre a végpontokra épül (fetch)

### Egyéb API-k (backend megvan)
- **Kategóriák** – `GET /api/categories`
- **Videók lista** – `GET /api/videos`
- **Ország talent** – `GET /api/global/countries/[countryCode]/talent`
- **Feed trending** – `GET /api/feed/trending`
- **Challenges** – `GET /api/challenges`, `GET /api/challenges/[slug]`, enter, leaderboard
- **Battles** – `GET /api/battles/[id]`, vote, scores
- **Leaderboard** – `GET /api/leaderboard/support`, `GET /api/leaderboard/creators`
- **Cron** – ranking-refresh, rank-talents
- **Notifications** – `GET /api/notifications` – Navbar NotificationsBell
- **Profil supporters / monetization** – `GET /api/profile/[username]/supporters`, monetization
- **Internal audio analysis** – pending, result, failed (webhook, INTERNAL_AUDIO_ANALYSIS_API_KEY)

### Dashboard / Settings
- **Dashboard** – `GET /api/auth/me` + `GET /api/videos/me` – valódi adat
- **Settings** – nyelv: PATCH /api/users/me; verification: GET/POST creators/verification

### Infra / adatbázis
- **Prisma** – PostgreSQL, séma naprakész (Video.votesCount, talentScore, Vote, stb.), migrációk futtatva
- **Session** – iron-session, cookie
- **Storage** – R2/S3 kompatibilis (presigned upload/playback), opcionális: ha nincs env, direct upload “not configured”

### i18n
- **Nyelvek** – en, es, fr, hu – fordítások, locale cookie, preferredLocale user mező

---

## 2. NINCS BEKÖTVE / PLACEHOLDER / HIÁNYZÓ

### Oldalak – csak UI vagy placeholder adat
- **Profil oldal** (`/profile/[username]`) – **NINCS bekötve.** A lap `profilePlaceholder.ts`-ből veszi a PLACEHOLDER_CREATOR, PLACEHOLDER_VIDEOS, PLACEHOLDER_LIKED_VIDEOS, PLACEHOLDER_CHALLENGES adatokat. Az `GET /api/profile/[username]` API **létezik és kész**, de a profil **oldal nem hívja** – helyette fix placeholder-t renderel.
- **Following oldal** (`/following`) – Csak üzenet: “Follow creators to see their performances here.” Nincs `GET /api/feed/following` hívás, nincs “following” feed adat.
- **Challenges slug oldal** (`/challenges/[slug]`) – `CHALLENGE_PLACEHOLDER`, TOP_THREE, LEADERBOARD_PREVIEW, ENTRIES konstansok. Nincs `GET /api/challenges/[slug]` vagy leaderboard/enter bekötve az oldalra.
- **Leaderboard oldal** (`/leaderboard`) – TOP_3, RANKING, CHALLENGE_LEADERBOARD konstansok. Nincs fetch az `api/leaderboard/...` végpontokra.

### API-k – “Not implemented” vagy üres
- **Keresés** – `GET /api/search` – válasz: `{ ok: false, message: 'Not implemented' }`.
- **Komment törlés** – `POST /api/comments/delete` (vagy DELETE) – válasz: `{ ok: false, message: 'Not implemented' }`.

### Űrlapok – nincs backend
- **Contact** (`/contact`) – Űrlap submit csak `setSubmitted(true)` (lokális state). Nincs POST /api/contact vagy email küldés.
- **Settings – profil szekció** – Megjelenik displayName, username, bio, country, email, jelszó mezők; a **profil adatok mentése** nem hív egy központi “update profile” API-t (csak preferredLocale és verification van bekötve). Ha van PATCH profile-ra, azt külön ellenőrizni kell a settings kódjában.

### Fizetés
- **Coin vásárlás** – Mock provider: “Payment integration coming soon. Coins will be credited when payment is enabled.”
- **Wallet oldal** – szöveg: “Payment integration coming soon. Coins are used to send gifts…”

### Egyéb
- **Share tracking** – Nincs `POST /share` vagy analytics; copy link működik.
- **Feed tabok** – A feed oldalon a “Following / Trending / New Voices / Challenges” tabok UI-only: csak “For You” tölt valódi adatot (for-you API).
- **Navbar profil link** – A QA-AUDIT szerint mindig `/login`-ra megy; bejelentkezett usernek dinamikus profile link kellene (`/profile/[username]`).
- **VideoCard / VideoFeedCard** – Follow gomb gridön/nagy feed kártyán: nincs creatorId a payloadban vagy nem FollowButton, ezért “UI only”.
- **Fraud risk** – fraud-risk.service: “Current implementation: placeholder; real logic would query FraudEvent.details”.
- **Gift celebration** – “Architecture placeholder” – egyszerű animáció, nincs típusonkénti teljes animáció.

---

## 3. ÖSSZEFOGLALÓ TABELLA

| Terület            | Bekötve | Nincs / Placeholder |
|--------------------|--------|----------------------|
| Auth               | Regisztráció, login, logout, session, auth/me | — |
| Profil **API**     | Igen (profile/[username], videos, monetization) | — |
| Profil **oldal**   | — | Placeholder adat, nem hívja az API-t |
| Feed For You       | Igen | — |
| Feed Following     | — | Nincs API hívás, UI only |
| Trending / Explore | Igen (server, Prisma) | — |
| Video detail       | Igen | — |
| My Videos / Dashboard | Igen | — |
| Upload (fájl)      | Igen, ha R2/S3 be van állítva | — |
| Like / Vote / Super vote | Igen (modál) | Kártyákon csak megjelenítés |
| Follow             | Igen (profil + modál) | Kártyákon nincs creatorId / API |
| Comments           | Create igen | Delete “Not implemented” |
| Wallet / gifts     | API-k, UI | Fizetés (coin purchase) placeholder |
| Moderation         | Igen (queues, actions, logs, notes, audit) | — |
| Settings           | Nyelv, verification | Profil mezők mentése nem egyértelműen egy API-ra kötve |
| Search             | — | API “Not implemented” |
| Contact            | — | Nincs backend, csak lokális state |
| Challenges slug oldal | — | Placeholder adat |
| Leaderboard oldal  | — | Placeholder adat |
| Cron / internal    | ranking, rank-talents, audio-analysis webhook | — |

---

## 4. KÖVETKEZŐ LÉPÉSEK (prioritás szerint)

1. **Profil oldal** – A `/profile/[username]` oldal használja a `GET /api/profile/[username]` választ (profile, videos), ne a profilePlaceholder-t.
2. **Following feed** – Vagy `GET /api/feed/following` implementálása és a Following oldalra kötése, vagy egyértelmű “coming soon” üzenet.
3. **Navbar** – Bejelentkezett user: profil link → `/profile/[username]`, dropdown (profile / settings / logout).
4. **Search** – `GET /api/search` implementálása (pl. videók, felhasználók keresése), vagy a keresés átirányítása explore-ra query-vel.
5. **Comments delete** – `api/comments/delete` implementálása, ha kell a funkció.
6. **Contact** – Backend (POST /api/contact vagy email service) és Űrlap bekötése.
7. **Challenges / Leaderboard oldalak** – Meglévő API-k (challenges/[slug], leaderboard) bekötése az oldalakra, vagy nyilvánvaló “demo/placeholder” felirat.
8. **Card Follow** – Feed és grid payloadokba creatorId; FollowButton használata a kártyákon.
9. **Fizetés** – Valódi payment provider (Stripe stb.) a coin purchase-hoz, ha a termékben kell.

---

*Utolsó ellenőrzés: kódbázis és docs/QA-AUDIT.md alapján. Prisma migrációk alkalmazva (votesCount, talentScore, Vote, user preferredLocale).*
