# BeTalent Platform — Product QA Audit

**Scope:** Visible features classified as **working** / **partially working** / **UI only** / **broken** / **missing**.  
**Focus:** Behavior and wiring (APIs, state, navigation), not design-only.

---

## 1. Topbar (Navbar)

| Area | Status | Notes |
|------|--------|--------|
| Logo → home | **Working** | Links to `/`. |
| Search | **Working** | Form submits to `/explore?q=...`. |
| Trending (icon) | **Working** | Links to `/explore` (or intended explore). |
| Notifications | **Working** | `NotificationsBell` fetches `GET /api/notifications`; dropdown shows real likes, comments, follows, gifts; read state in localStorage. |
| Profile link | **Broken** | Always goes to `/login`. No session check; logged-in users cannot open profile from topbar. |

**Next step:** Make profile link dynamic: when authenticated → `/profile/[username]` or dropdown (profile / settings / logout); when not → `/login`.

---

## 2. Feeds

| Feed | Status | Notes |
|------|--------|--------|
| For You | **Partially working** | Uses `GET /api/feed/for-you` and real ranked data when available. When API returns empty, feed falls back to `MOCK_FEED`. So: real when DB has videos, mock otherwise. |
| Following | **UI only** | Page exists at `/following` but uses static `FOLLOWED_CREATORS` and `FOLLOWING_VIDEOS`; no API. |
| Trending / New Voices / Challenges (tabs) | **UI only** | Tab bar present; content still `MOCK_FEED` (not tab-specific APIs). |

**Next step:** Add `GET /api/feed/following` (and optional trending/new-voices/challenges APIs) and wire Following page; remove or clearly label mock data.

---

## 3. Cards

| Context | Status | Notes |
|---------|--------|--------|
| Grid (Explore, Profile, Following) | **Partially working** | `VideoCard` renders real or mock data; click opens PerformanceModal; share opens ShareModal. Like, views, comments, vote (star) are **display-only** (no API). Follow button is **UI only** (inline button with `e.preventDefault()`, not `FollowButton`). |
| For You stack (VideoFeedCard) | **Partially working** | Renders feed item; click opens PerformanceModal; share opens ShareModal. Follow button is **UI only** (no `creatorId` in `VideoFeedItem`, button does nothing). Like/vote not shown on card. |

**Next step:** Add `creatorId` to feed/grid payloads; use shared `FollowButton` with `targetId={creatorId}` on both VideoCard and VideoFeedCard. Optionally wire like (and super-vote) on cards.

---

## 4. Like

| Context | Status | Notes |
|---------|--------|--------|
| Performance modal | **Working** | Calls `POST /api/likes/toggle`; updates local `liked` and `likesCount`; syncs with `user-state`. |
| Cards (grid / feed) | **UI only** | Count displayed only; no toggle or API. |

**Next step:** Optional: add like toggle on cards (e.g. open modal or inline API call) for consistency.

---

## 5. Vote (Super Vote)

| Context | Status | Notes |
|---------|--------|--------|
| Performance modal | **Working** | `SuperVoteModal` calls `POST /api/videos/[id]/super-vote`; wallet debited, creator credited; UI updates. |
| Cards (grid) | **UI only** | Star and count are display-only; no API. |

**Next step:** Optional: keep vote in modal only, or add “Super vote” from card (e.g. opens modal).

---

## 6. Share

| Context | Status | Notes |
|---------|--------|--------|
| Share modal (copy link) | **Working** | ShareModal opens from VideoCard and VideoFeedCard; builds URL; copy-to-clipboard works. |
| Share tracking | **Missing** | No `POST /share` or analytics; no server-side share count. |

**Next step:** If product needs share metrics, add share-tracking API and optional count on cards.

---

## 7. Follow

| Context | Status | Notes |
|---------|--------|--------|
| Profile page | **Working** | Uses `FollowButton`; `POST/DELETE /api/follow`; optimistic toggle; counts updated. |
| Performance modal | **Working** | Uses same `FollowButton` with `targetId={creatorId}`. |
| VideoCard (grid) | **UI only** | Inline Follow button with `e.preventDefault()`; not `FollowButton`; no API. |
| VideoFeedCard (For You) | **UI only** | Follow button has no `creatorId` in item type and no API call. |

**Next step:** Add `creatorId` to feed and grid payloads; replace card Follow buttons with `FollowButton` (with `targetId={creator.id}`).

---

## 8. Comments

| Context | Status | Notes |
|---------|--------|--------|
| Performance modal | **Working** | Comments load via `GET /api/comments`; **create:** `POST /api/comment` (canonical). Legacy `POST /api/comments/create` is deprecated HTTP-only alias. |
| Video detail page | **Working** | Same: `POST /api/comment` where comment form exists. |
| Cards | N/A | Comments not shown on cards (count only). |

**Next step:** None for core behavior; optional: real-time or pagination for long threads.

---

## 9. Upload

| Area | Status | Notes |
|------|--------|--------|
| Page & form | **Working** | `/upload` exists; form validates title, vocal style, file + duration; uses direct upload (`POST /api/upload/init` → PUT → `POST /api/videos/upload/complete` via `performDirectUpload`); 401 redirects to login. Legacy `POST /api/videos/upload` returns **410 Gone**. |
| Flow | **Partially working** | Uses **video URL** (not file upload); no drag-and-drop file; challenge picker present (optional). |

**Next step:** If product requires native file upload, add upload pipeline (e.g. presigned URL or multipart) and wire to same API or new endpoint.

---

## 10. Wallet

| Area | Status | Notes |
|------|--------|--------|
| API | **Working** | `GET /api/wallet`; transactions and coin packages used by wallet page. |
| Wallet page | **Working** | Fetches wallet, transactions, coin packages; shows balance, payout readiness, top earnings. |
| Performance modal | **Working** | Fetches wallet for gift/super-vote UI. |

**Next step:** None for core behavior.

---

## 11. Performance modal

| Feature | Status | Notes |
|---------|--------|--------|
| Open / close | **Working** | Opens from card click (grid and feed); closes correctly. |
| Video + user state | **Working** | Fetches `/api/videos/[id]` and `/api/videos/[id]/user-state`; shows liked/following. |
| View count | **Working** | `POST /api/videos/[id]/view` on open (no 3s or session throttling in code). |
| Like | **Working** | Toggle wired; state and count updated. |
| Follow | **Working** | `FollowButton` with creator id. |
| Comment submit | **Working** | Create comment; list from video payload. |
| Share | **Working** | ShareModal available; copy link works (no share tracking). |
| Super vote / Gift | **Working** | Modals call APIs; wallet and support stats used. |

**Next step:** Optional: view throttling (e.g. count view after 3s watch or once per session) to reduce inflation.

---

## 12. Responsive behavior

| Area | Status | Notes |
|------|--------|--------|
| Layout | **Working** | Breakpoints used (e.g. feed max-widths: md/lg/1366/1920); Navbar, Sidebar, MobileNav; feed container and card sizes by breakpoint. |
| Feed / cards | **Working** | VideoFeedCard and feed container use responsive max-widths and padding; grid uses responsive columns. |
| Mobile nav | **Working** | MobileNav present; upload and other links available. |

**Next step:** None for core behavior; optional: run device tests for touch and overflow.

---

## Summary table

| Feature | Status | Priority fix |
|---------|--------|--------------|
| Topbar | Partially working | Dynamic profile link for logged-in users |
| Feeds | Partially working | Real Following API; reduce mock fallback |
| Cards | Partially working | Follow + optional like/vote on cards |
| Like | Working (modal); UI only (cards) | Optional: wire like on cards |
| Vote | Working (modal); UI only (cards) | Optional: wire from card to modal |
| Share | Working (copy); missing tracking | Add share API if needed |
| Follow | Working (profile + modal); UI only (cards) | Wire FollowButton on cards with creatorId |
| Comments | Working | — |
| Upload | Working (URL-based) | Add file upload if required |
| Wallet | Working | — |
| Performance modal | Working | Optional: view throttling |
| Responsive | Working | — |

---

*Audit based on codebase review (Navbar, Sidebar, MobileNav, feed pages, VideoCard, VideoFeedCard, PerformanceModal, ShareModal, FollowButton, APIs for follow, like, comment, view, wallet, upload, notifications, for-you feed).*
