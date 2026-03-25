# BeTalent – Teljes rendszer lista (helyes sorrend) – Állapot

Minden pont állapota: **Bekötve** = API + UI működik, **Részben** = van kód de hiányzik vagy placeholder, **Nincs** = nincs implementálva.

---

## 1️⃣ Auth stabilizálás (LEGELSŐ) — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| register | ✅ | `POST /api/auth/register`, RegisterForm |
| login | ✅ | `POST /api/auth/login`, LoginForm |
| logout | ✅ | `POST /api/auth/logout` |
| session | ✅ | iron-session, `src/lib/session.ts` |
| current user | ✅ | `getCurrentUser()`, `requireAuth()` in `src/lib/auth.ts` |
| auth guard | ✅ | Middleware: protected prefixek → redirect login ha nincs session |
| protected routes | ✅ | `/dashboard`, `/upload`, `/profile`, `/settings`, `/notifications`, `/my-videos`, `/wallet`, `/creator` |
| cookie security | ✅ | Session cookie (betalent_session) |
| password hash | ✅ | Auth service (regisztráció) |
| email unique | ✅ | Prisma User.email @unique |
| profile létrehozás | ✅ | User rekord regisztrációkor |

---

## 2️⃣ User profile rendszer — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Profil oldal | ✅ | `(protected)/profile/[username]/page.tsx` – **100% valós adat**. Szerver oldali fetch: `getProfileByUsername`, `getProfileVideos`, `getProfileTruthfulStats`. |
| API profilhoz | ✅ | `GET /api/profile/[username]` – profile + videos + monetization |
| avatar, username, country, bio | ✅ | User modellben + API válaszban |
| followers / following | ✅ | User.followersCount, followingCount; FollowButton bekötve ha `creatorId` meg van adva |
| performances list | ✅ | `getProfileVideos` – valós videók a profil oldalon |
| stats | ✅ | ProfileStatsBar, API |

---

## 3️⃣ Video upload + storage — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Upload API | ✅ | `POST /api/upload/init` → client PUT → `POST /api/videos/upload/complete` (legacy `POST /api/videos/upload` → **410**) |
| Upload oldal | ✅ | `(protected)/upload/page.tsx`, UploadDropzone |
| Storage | ✅ | Konfigurált (pl. R2/S3/local) – upload/complete menti |
| iPhone / Mac upload | ✅ | Fájl input + drag&drop (böngésző) |

---

## 4️⃣ Video processing — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Thumbnail | ✅ | `thumbnail.service.ts`, internal/audio-analysis |
| Format / duration | ✅ | Processing pipeline, Video.durationSec, stb. |
| Metadata mentés | ✅ | Video rekord frissítése processing után |
| Flow: upload → processing → ready | ✅ | UploadStatus, ProcessingStatus, status READY |

---

## 5️⃣ Performance rendszer (videó modell) — **Bekötve**

A projektben **Video** a “performance” (nincs külön Performance modell).

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| title, description, videoUrl, thumbnailUrl | ✅ | Video modell |
| creator | ✅ | Video.creatorId → User |
| stats (views, likes, votes, comments, shares) | ✅ | Video: viewsCount, likesCount, votesCount, commentsCount, sharesCount |
| createdAt | ✅ | Video modell |

---

## 6️⃣ Core interactions — **Bekötve**

| Interaction | API | UI komponens | Állapot |
|-------------|-----|--------------|--------|
| ❤️ Like | `POST /api/like`, `DELETE /api/like` | LikeButton (kártya, modal, detail) | ✅ |
| ⭐ Vote | `POST /api/vote` | VoteButton | ✅ |
| 👁 Views | `POST /api/view`, `POST /api/videos/[id]/view` | Modal open + 3s watch (FeedVideoPlayer, VideoPlayer, VideoDetailClient) | ✅ |
| 💬 Comments | `GET /api/comments`, `POST /api/comment` | CommentsPanel (modal, detail) | ✅ |
| ➕ Follow | `POST /api/follow`, `DELETE /api/follow` | FollowButton (detail, modal, profile) | ✅ |
| ↗ Share | `POST /api/share` | ShareModal, ShareButton | ✅ |

Optimistic UI + rollback: LikeButton, FollowButton, VoteButton – mind megvan.

---

## 7️⃣ Feed rendszer — **Bekötve**

| Feed | API | Ügyfél (feed oldal) | Állapot |
|------|-----|---------------------|--------|
| For You | `GET /api/feed/for-you` | ✅ Valós adat, cursor + excludeIds, infinite scroll | ✅ Bekötve |
| Following | `GET /api/feed/following` | ✅ Tab bekötve, cursor pagination, infinite scroll | ✅ Bekötve |
| Trending | `GET /api/feed/trending` | ✅ Tab bekötve, offset pagination, infinite scroll | ✅ Bekötve |
| New Voices | `GET /api/feed/new-voices` | ✅ Tab bekötve, cursor pagination, infinite scroll | ✅ Bekötve |
| Explore | — | Nincs dedikált `/api/feed/explore`; explore page külön (kategóriák) | ⚠️ |

**Megjegyzés:** Feed oldal 100% valós adat. Following/Trending/New Voices tabok bekötve. Infinite scroll működik (IntersectionObserver, append, deduplicate). `fetchFeedWithRetry` – timeout + retry.

---

## 8️⃣ Feed algorithm — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Ranking / score | ✅ | `ranking.service.ts`, Video.score, stb. |
| For You logika | ✅ | `for-you-feed.service.ts`, súlyok (likes, comments, shares, stb.) |
| Freshness, creator diversity | ✅ | Feed konstansok, ranking |

---

## 9️⃣ Notifications rendszer — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| API | ✅ | `GET /api/notifications` (follow, like, comment, gift) |
| UI | ✅ | NotificationsBell, NotificationsDropdown, NotificationsPageClient |

---

## 🔟 Messaging / chat — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Prisma | ✅ | `DmConversation` (user1Id &lt; user2Id, `lastMessageAt`, `lastMessagePreview`), `DmMessage` (senderId, receiverId, content, isRead, readAt, createdAt) |
| API | ✅ | `GET /api/chat/conversations`, `GET /api/chat/[userId]/history`, `POST /api/chat/send`, `GET /api/chat/unread` (badge polling) |
| UI | ✅ | `DmSlidingPanel` (mobil-first slide-in), `ChatPanelProvider`, Navbar + Sidebar badge, profil **Message** |
| Valós idejű érzet | ✅ | Polling (beszélgetések ~4s, thread ~2.8s, olvasatlan ~14s) |
| Read receipts | ✅ | `isRead` / `readAt`; partner megnyitja a threadet → `GET .../history` mark read; saját buborékban „Read” |

---

## 1️⃣1️⃣ Wallet / coins — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| coins | ✅ | UserWallet, `GET /api/wallet`, coin balance |
| purchase | ✅ | `POST /api/coins/purchase` + Stripe webhook-authoritative fulfill + refund/dispute reversal |
| gifts | ✅ | `POST /api/gifts/send`, GiftModal |
| super vote | ✅ | `POST /api/videos/[id]/super-vote`, SuperVoteModal |
| earnings | ✅ | Creator earnings, payout, dashboard API-k (unsettled refund/dispute holds surfaced) |
| reversal safety | ✅ | Purchase reversal arithmetic row-locked (`FOR UPDATE`) in interactive tx → production-grade concurrent-safe |

---

## 1️⃣2️⃣ Moderation — **Bekötve**

| Elem | Állapot | Megjegyzés |
|------|---------|------------|
| Moderation API | ✅ | `moderation/queues`, `moderation/actions`, `moderation/logs`, `moderation/detail`, stb. |
| Admin / mod UI | ✅ | `(protected)/moderation/page.tsx` |
| Report / block / remove | ✅ | Moderation services, action log |

---

## Összefoglaló tábla

| # | Rendszer | Állapot | Mi hiányzik (ha van) |
|---|----------|---------|----------------------|
| 1 | Auth stabilizálás | ✅ Bekötve | — |
| 2 | User profile | ✅ Bekötve | — |
| 3 | Video upload + storage | ✅ Bekötve | — |
| 4 | Video processing | ✅ Bekötve | — |
| 5 | Performance (Video) rendszer | ✅ Bekötve | — |
| 6 | Core interactions | ✅ Bekötve | — |
| 7 | Feed rendszer | ✅ Bekötve | — |
| 8 | Feed algorithm | ✅ Bekötve | — |
| 9 | Notifications | ✅ Bekötve | — |
| 10 | Chat / DM | ✅ Bekötve | WebSocket később opcionális |
| 11 | Wallet / coins | ✅ Bekötve | — |
| 12 | Moderation | ✅ Bekötve | — |

---

## Következő lépések (prioritás)

1. **Chat:** DM 1:1 kész (Prisma + API + slide panel). Opcionális: WebSocket, tiltás/blokkolás, csatolmány.

A fenti sorrend (1–12) a helyes fejlesztési sorrend. Profil oldal és Feed rendszer **100% valós adat**; Following/Trending/New Voices tabok bekötve, infinite scroll működik.
