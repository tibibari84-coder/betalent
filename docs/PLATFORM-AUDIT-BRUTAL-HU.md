# BETALENT — brutálisan őszinte platform-audit (állapot-vázlat)

**Cél:** Egy helyen látszódjon, mi **kész és működik**, mi **részben**, mi **hiányzik / marketing vs valóság**, és mit **nem** érdemes állítani „kész”-nek launch előtt.

**Fontos:** A régi `docs/STATUS-BEKOTVE-NINCS.md` több pontja **elavult** (pl. profil, following feed, search, leaderboard, challenge slug — már bekötve). Ezt a fájlt tekintsétek **aktuálisnak**; a régit frissíteni vagy erre hivatkozni.

---

## A) Architektúra (backend / domain)

| Terület | Állapot | Megjegyzés |
|--------|---------|------------|
| Auth (register, login, logout, session, 2FA, email verify) | **Erős** | Middleware: védett útvonalak, verify-email kényszer |
| Follow | **Konszolidált** | Service + API; FollowButton több helyen |
| Komment létrehozás | **Egy domain** | `createCommentOnVideo`; kanonikus `POST /api/comment`; legacy `POST /api/comments/create` deprecated fejlécekkel |
| Komment törlés | **Implementálva** | `POST /api/comments/delete` (soft delete + jogosultság) — ellenőrizd UI bekötést |
| Videó lekérés / view / like / vote / super-vote | **Működik** | `video.service`, moderation, visibility szabályok |
| Wallet, gifts, tranzakciók | **Működik** | Dev test coins route nem-prod |
| Coin vásárlás | **Stripe test** | `POST /api/coins/purchase` + webhook; **live (`pk_live` / `sk_live`) szándékosan nem „launch”** |
| Ranking / discovery | **Logika megvan, dokumentálva** | `docs/RANKING-ASSEMBLY.md`; teljes „audit lezárás” külön QA feladat |
| Moderation (queue, actions, logs) | **Működik** | Védett `/moderation` |
| Cron (ranking refresh, talent rank) | **Megvan** | Env + ütemezés környezetfüggő |
| Keresés | **Nem stub** | `GET /api/search` — Prisma + discovery visibility |

---

## B) Oldalanként (mit csinál a felület)

### Nyilvános

| Útvonal | Mi történik | Őszinte megjegyzés |
|---------|-------------|---------------------|
| `/` | Session alapján → `/feed` vagy `/welcome` | OK |
| `/welcome`, `/landing` | Belépés előtti élmény | OK |
| `/explore` | Prisma: trending, new voices, rails, challenge hero, suggested creators | **„Featured performers coming soon”** szekció — még nincs kitöltve |
| `/feed` | Client: **For You, Following, Trending, New Voices** API-k | **„Challenges” tab:** coming soon üzenet, nem challenge feed |
| `/following` | `GET /api/feed/following` | **Kész** — a régi „csak üres szöveg” doc már nem igaz |
| `/trending` | Server: `getTrendingVideos` + challenge blokk | Valós adat |
| `/leaderboard` | Client: `GET /api/leaderboard` szűrőkkel | **Kész** — nem placeholder |
| `/challenges` | Lista | API-hez kötve (ellenőrizd aktuális fetch-et) |
| `/challenges/[slug]` | Több API: challenge, ranking, participants, entry-status, votes | **Kész** — nem CHALLENGE_PLACEHOLDER-only |
| `/live/[slug]` | Live challenge UI, poll, session | Komplex; env + session függő |
| `/video/[id]` | Server: `getVideoById`, related, user state + client | **Nem „üres placeholder oldal”** — teljes detail |
| `/v/[id]` | Redirect `/video/[id]` + `?ref=` | OK |
| `/global` | `GlobalTalentMap` — országonként API | Valós adat a map kattintásra |
| `/genres` | Statikus genre lista + **üres** `FEATURED_VOICES` / `TRENDING_*` tömbök | **Gyenge:** főleg layout + üres állapot; nem teljes genre-discovery |
| `/about`, `/fair-play`, `/content-policy`, `/legal/*`, `/privacy`, `/terms` | Statikus / jogi szöveg | OK |
| `/contact` | `POST /api/contact` + `CONTACT_INBOX_EMAIL`; Resend/SendGrid | Siker csak valós küldésnél vagy dev naplózásnál — nincs ál-siker |

### Auth

| Útvonal | Állapot |
|---------|---------|
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/login/2fa` | Bekötve API-kkal |

### Védett (middleware)

| Útvonal | Állapot | Megjegyzés |
|---------|---------|------------|
| `/dashboard` | `auth/me` + `videos/me` | OK |
| `/upload` | Upload pipeline R2/S3-től függ | Nincs storage → „not configured” |
| `/wallet` | Wallet + csomagok + Stripe readiness | Szöveg: fizetés csak ha Stripe test kész |
| `/settings` | PATCH `users/me`, avatar, preferences, jelszó, 2FA | **Profil mezők mentése bekötve** (fetch a fájlban) |
| `/notifications` | API | OK |
| `/my-videos` | Saját videók | OK |
| `/profile/me` | Redirect → `/profile/[username]` | OK |
| `/profile/[username]` | **Server: `getProfileByUsername` + jogosultság** | **Kész** — nem placeholder-only |
| `/creator` | Redirect → `/creator/analytics` | OK |
| `/creator/analytics` | Creator analytics | Ellenőrizd env + adat |
| `/moderation` | Moderátori queue | OK |
| `/admin`, `/admin/live-control` | Belső eszközök | Szűk körben |

---

## C) Mit állít a „near-100% launch” és mi **nem igaz** még

- **Igaz:** core auth, feedek (for-you, following, trending, new voices, challenge videók), videó detail, profil (szerver oldali), leaderboard, challenge slug, komment írás, követés, wallet+ajándék, moderation, Stripe **test** útvonal, **contact** (inbox + email provider).
- **Nem igaz / részben:** teljes **E2E lezárás minden ágra**; **genres** oldal nem tartalmaz per-genre live API sorokat (őszinte blokk + Explore link); **teljes** discovery „no leak” audit minden route-on; **reszponzív QA** minden törésponton; **production Stripe**.

---

## D) Mit kell még „bekötni” vagy dönteni (prioritás)

1. **Explore** — További kurált featured logika (opcionális).
2. **Genres** — Opcionális: szerver oldali genre carousel API.
3. **STATUS-BEKOTVE-NINCS.md** — Frissítés vagy deprecate, hogy ne félrevezessen.
4. **Launch Stripe** — Külön milestone; ENV és jogi checklist.

---

## E) QA / smoke

- `docs/SMOKE-FLOWS-CHECKLIST.md` — kötelező flow-k kézi ellenőrzése.
- `docs/RANKING-ASSEMBLY.md` — ranking/discovery módosításkor.

---

*Generálva: kódbázis és aktuális route-ok ellenőrzése alapján. Eltérések esetén a forráskód az igazság.*
