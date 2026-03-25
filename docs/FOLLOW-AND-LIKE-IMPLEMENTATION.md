# Follow + Like – Implementation Reference

Real backend + frontend for Follow and Like. No UI redesign; layout sizes unchanged.

---

## 1. Prisma schema (existing)

### Follow

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  follower    User     @relation("UserFollowing", fields: [followerId], references: [id], onDelete: Cascade)
  followingId String
  following   User     @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
```

- **User** must have: `followers Follow[] @relation("UserFollowers")` and `following Follow[] @relation("UserFollowing")`, plus `followersCount Int`, `followingCount Int`.

### Like

```prisma
model Like {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  videoId   String
  video     Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, videoId])
  @@index([videoId])
}
```

- **Video** must have: `likes Like[]` and `likesCount Int @default(0)`.
- **User** must have: `likes Like[]`.

No schema changes required if these models and relations already exist.

---

## 2. API routes

### Follow

- **POST /api/follow**  
  - Body: `{ creatorId: string }`.  
  - Auth: required (401 if not logged in).  
  - Rules: `creatorId` required; user cannot follow themselves (400).  
  - Idempotent: if already following, returns success.  
  - Creates `Follow`, increments follower’s `followingCount` and creator’s `followersCount`.  
  - Returns: `{ ok: true, following: true, followersCount: number }`.

- **DELETE /api/follow**  
  - Body: `{ creatorId: string }`.  
  - Auth: required.  
  - Rules: same as POST for self-unfollow.  
  - Idempotent: if not following, returns success.  
  - Deletes `Follow`, decrements both counts.  
  - Returns: `{ ok: true, following: false, followersCount: number }`.

**File:** `src/app/api/follow/route.ts` (POST + DELETE in one file).

### Like

- **POST /api/like**  
  - Body: `{ videoId: string }`.  
  - Auth: required (401 if not logged in).  
  - Validates video exists and `status === 'READY'` (404 otherwise).  
  - Idempotent: if already liked, returns success.  
  - Creates `Like`, increments `Video.likesCount`.  
  - Returns: `{ ok: true, liked: true, likesCount: number }`.

- **DELETE /api/like**  
  - Body: `{ videoId: string }` (or query `videoId`).  
  - Auth: required.  
  - Same video validation.  
  - Idempotent: if not liked, returns success.  
  - Deletes `Like`, decrements `Video.likesCount`.  
  - Returns: `{ ok: true, liked: false, likesCount: number }`.

**File:** `src/app/api/like/route.ts` (POST + DELETE in one file).

---

## 3. Frontend components

### FollowButton

- **File:** `src/components/profile/FollowButton.tsx`
- **Props:** `targetId`, `initialFollowing?`, `onToggle?(following, followersCount?)`, `variant`, `size`, `className`, `stopPropagation?`
- **Behaviour:** Optimistic toggle (Follow ↔ Following); on 401 or non-ok response, reverts and optionally redirects to login. Calls `POST` or `DELETE /api/follow` with `{ creatorId: targetId }`.

### LikeButton

- **File:** `src/components/video/LikeButton.tsx`
- **Props:** `videoId`, `initialLiked`, `initialLikesCount`, `onToggle?(liked, likesCount)?`, `onAuthRequired?`, `variant`, `className`, `label?`, `stopPropagation?`
- **Behaviour:** Optimistic toggle; on 401 calls `onAuthRequired` or redirects to login; on error reverts. Calls `POST` or `DELETE /api/like` with `{ videoId }`.

---

## 4. Where Follow / Like are wired

### Follow buttons (all use FollowButton → real backend)

| Location | File | Props / notes |
|----------|------|----------------|
| Video detail (creator row) | `src/app/(public)/video/[id]/VideoDetailClient.tsx` | `targetId={video.creator.id}`, `initialFollowing={initialFollowing}`, `onToggle` to update `followersCount` |
| Performance modal (creator row) | `src/components/performance/PerformanceModal.tsx` | `targetId={video.creator.id}`, `initialFollowing={userState.following}` |
| Profile header | `src/app/(protected)/profile/[username]/ProfileHeader.tsx` | `targetId={creatorId}`, `initialFollowing` when `creatorId` is passed (real profile) |
| Profile actions | `src/app/(protected)/profile/[username]/ProfileActions.tsx` | `targetId={profileId}`, `initialFollowing` |

### Like buttons (all use LikeButton → real backend)

| Location | File | Props / notes |
|----------|------|----------------|
| Video detail (action bar) | `src/app/(public)/video/[id]/VideoDetailClient.tsx` | `videoId`, `initialLiked`, `initialLikesCount`, `onToggle`, `onAuthRequired={redirectToLogin}`, `variant="buttonCompact"` |
| Performance modal (support actions) | `src/components/performance/PerformanceModal.tsx` | `videoId`, `initialLiked`, `initialLikesCount`, `onToggle`, `variant="button"` |
| Video cards (grid) | `src/components/video/VideoCard.tsx` | `videoId={id}`, `initialLiked={false}`, `initialLikesCount={stats.likesCount}`, `variant="inline"`, `stopPropagation` |
| Feed cards | `src/components/feed/VideoFeedCard.tsx` | Same pattern: `videoId`, `initialLiked={false}`, `initialLikesCount={stats.likesCount}`, `variant="inline"`, `stopPropagation` |

No placeholder-only Follow or Like buttons; all visible hearts and Follow controls use the components above and hit the APIs.

---

## 5. User-state for Follow / Like

- **Video detail page:** `initialFollowing` and `initialLiked` come from the server in `getVideoUserState()` (used by `GET /api/videos/[id]/user-state`). The video page passes them into `VideoDetailClient`.
- **Performance modal:** Fetches `GET /api/videos/[id]/user-state` and sets `userState.following` and `liked` from the response, then passes them into `FollowButton` and `LikeButton`.
- **Cards:** Use `initialLiked={false}` and server-provided `likesCount`; no per-card user-state fetch. First click still goes to the real API and updates count.

---

## 6. Migrations

If Follow and Like tables are already in the schema and migrations were applied, no new migration is needed.

If you add the models for the first time:

1. Add the `Follow` and `Like` models (and User/Video relations + counts) in `prisma/schema.prisma`.
2. Run:
   ```bash
   npx prisma migrate dev --name add_follow_and_like
   ```
   or create a migration manually and then:
   ```bash
   npx prisma migrate deploy
   ```
3. Run:
   ```bash
   npx prisma generate
   ```

---

## 7. Summary

- **Follow:** Table with unique `(followerId, followingId)`; POST/DELETE `/api/follow`; follower count updated; all Follow buttons use `FollowButton` with optimistic UI and rollback.
- **Like:** Table with unique `(userId, videoId)`; POST/DELETE `/api/like`; `likes_count` on performance (Video) updated; all heart buttons use `LikeButton` with optimistic UI and rollback.
- No UI redesign or layout size changes; only Follow and Like are implemented and connected end-to-end.
