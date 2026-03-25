# BeTalent – Amit eddig elkészült

## Technológia
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma (PostgreSQL)
- iron-session (auth)
- bcryptjs

---

## Adatbázis (Prisma)

### Modellek
- **User** – email, username, displayName, avatar, bio, country, creatorTier (STARTER/RISING), followersCount, likesCount, stb.
- **Category** – name, slug (singing, dance, rap, comedy, stb.)
- **Video** – creatorId, categoryId, title, videoUrl, thumbnailUrl, durationSec, status, viewsCount, likesCount, score
- **Comment** – userId, videoId, body
- **Like** – userId, videoId
- **Follow** – followerId, followingId
- **Wallet** – coinBalance
- **Gift** – sender, receiver, video, giftType (BRONZE_MIC, SILVER_GUITAR, GOLDEN_PIANO, DIAMOND_VOICE)
- **CoinTransaction** – coin tranzakciók
- **LeaderboardEntry** – videoId, year, week, score (heti ranglisták)

### Tesztfelhasználó (seed)
- Email: `betalent@gmail.com`
- Jelszó: `Test1234`

---

## Oldalak

### Nyilvános
- `/` – Landing
- `/explore` – Felfedezés (challenge hero, featured performers, trending, new voices, genre sorok)
- `/feed` – For You feed (vertical video feed)
- `/trending` – Challenges
- `/leaderboard` – Ranglista (Weekly/Monthly/All Time, Top 3, full ranking)
- `/following` – Követettek
- `/login` – Bejelentkezés
- `/register` – Regisztráció

### Védett (bejelentkezés kell)
- `/settings` – Beállítások (Profile, Account, Privacy, Notifications, Creator, Language)
- `/upload` – Videó feltöltés
- `/profile/[username]` – Profil
- `/notifications` – Értesítések
- `/my-videos` – Saját videók
- `/dashboard` – Dashboard

### Egyéb
- `/video/[id]` – Egyedi videó (placeholder)

---

## Komponensek

### Layout
- Navbar (60px mobile, 72px desktop)
- Sidebar (desktop)
- RightPanel (Trending, Top Talents)
- MobileNav – Explore, For You, Upload, Notifications, Profile (68px magas)
- Footer

### Feed / Video
- VideoFeedCard – vertical feed kártya (creator, challenge badge, right-side actions)
- VideoCard – grid kártya (Explore, Trending)
- FeedTabBar – For You, Following, Trending, New Voices, Challenges
- ShareModal – bottom sheet mobile
- CommentsPanel – bottom sheet mobile

### Egyéb
- NotificationsBell – harang, unread számláló (elolvasás után eltűnik)
- NotificationsDropdown
- Badge (trending, rising, new)
- LoginForm, RegisterForm
- UploadDropzone

---

## API végpontok
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/logout`
- GET `/api/auth/me`
- GET/POST `/api/videos`
- GET `/api/videos/[id]`
- POST `/api/videos/[id]/view`
- POST `/api/likes/toggle`
- POST `/api/comment` (canonical; `POST /api/comments/create` deprecated alias)
- POST `/api/follows/toggle`
- GET `/api/categories`
- GET `/api/search`

---

## Mobile refinelés
- Top bar: 60px mobile
- Bottom nav: 68px
- Padding: 16px
- One-column layout
- Tap targets: min 44×44
- Settings: no sidebar mobile, stacked sections, sticky save
- Leaderboard: stacked cards
- Comments/Share: bottom sheet
- Nested `<a>` fix (VideoCard – creator link → button + router.push)

---

## Konfiguráció
- `.env` – DATABASE_URL (betalent2), SESSION_SECRET
- Middleware – védett útvonalak: /settings, /upload, /profile, /notifications, /my-videos, /dashboard

---

## QA / smoke
- Kézi ellenőrzési lista: `docs/SMOKE-FLOWS-CHECKLIST.md`
- Discovery/ranking belépési pontok: `docs/RANKING-ASSEMBLY.md`
- **Őszinte platform-audit (oldalanként, mi kész / mi nem):** `docs/PLATFORM-AUDIT-BRUTAL-HU.md`

## Parancsok
```
npm run dev          # dev server
npm run build        # production build
npm run db:push      # schema → DB
npm run db:seed      # tesztadatok
npm run db:migrate   # migrációk
```
