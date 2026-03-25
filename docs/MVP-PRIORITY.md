# MVP implementation priority – testable product

Goal: make the app **truly testable** as soon as possible.

A creator must be able to:
- register / login
- upload a real video
- see it in the feed
- receive real interactions (follow, like, comment, share, vote, views)

Only after that should we prioritize feed ranking depth and notifications.

---

## Priority order

### 1. User auth stabilization (first)

If auth is unstable:
- follow, like, vote, upload, settings, language, profile are unreliable.

**Focus:**
- Register
- Login / logout
- Session persistence
- Auth guards (protected routes, API)
- Current user resolution stable everywhere (`getCurrentUser` / `requireAuth`)

**Stack (unchanged):** existing `src/lib/auth.ts` and session (e.g. iron-session). No redesign.

---

### 2. Direct video upload + storage (second)

Without real upload there is no real content:
- feed is fake/demo
- nothing real to like, vote, comment.

**Focus:**
- Direct upload flow
- Storage (e.g. S3 or current backend)
- Video appears in DB and in feed after processing/ready

**Stack (unchanged):** existing `Video` model and upload APIs. No schema rename to “Performance”.

---

### 3. Core interactions (third)

Before tuning the algorithm, reactions must work:

- **Follow** – already implemented (Follow model, POST/DELETE `/api/follow`, FollowButton)
- **Like** – already implemented (Like model, POST/DELETE `/api/like`, LikeButton)
- **Comment** – already implemented (Comment, GET/POST comments API, CommentsPanel)
- **Share** – already implemented (ShareEvent, POST `/api/share`, ShareModal/ShareButton)
- **Vote** – already implemented (Vote, POST `/api/vote`, VoteButton)
- **View tracking** – already implemented (ViewRecord, POST `/api/view`, modal + 3s watch)

**Focus:** keep these wired and stable; fix any bugs; no UI redesign.

---

### 4. Feed algorithm (fourth)

Once we have:
- real users
- real videos
- real interaction data

we can improve:
- ranking
- personalization
- “For You” vs “Following” vs trending

**Stack (unchanged):** existing feed/for-you/trending services and APIs.

---

### 5. Notifications (fifth)

Notifications are useful when there are real events:
- someone followed
- someone liked / commented / voted
- gifts, etc.

**Focus:** build on top of existing follow/like/comment/vote/gift events; no new UI layout.

---

## What we are *not* changing

- **Schema:** We keep **Video** (not “Performance”), **User** (current fields), **Follow**, **Like**, **Comment**, etc. No swap to a different schema with a “Performance” model or renamed relations.
- **Auth:** We keep current session/auth (`getCurrentUser`, `requireAuth`). No switch to a separate `getCurrentUserId` + cookie unless we explicitly decide to change auth later.
- **APIs:** Follow and Like stay with current semantics (`creatorId`, `videoId`). No change to `performanceId` or new response shapes that would break existing FollowButton/LikeButton.
- **UI:** No redesign; no layout size changes. Focus is “usable end to end”, not new visuals.

---

## Suggested next steps (concrete)

1. **Auth**
   - Review register/login/logout and session persistence.
   - Ensure every protected route and API uses the same auth helper and handles 401 consistently.

2. **Upload**
   - Verify direct upload → storage → `Video` created/updated → status READY.
   - Ensure uploaded videos show up in the feed (and on profile).

3. **Core interactions**
   - Smoke-test follow, like, comment, share, vote, view on a real video.
   - Fix any bugs (e.g. counts, optimistic UI, 401 handling).

4. **Then**
   - Iterate on feed algorithm and, later, notifications.

---

## Summary

| Order | Area                  | Purpose                          |
|-------|-----------------------|----------------------------------|
| 1     | User auth stabilization | Stable base for everything       |
| 2     | Video upload + storage | Real content in the app         |
| 3     | Core interactions     | Real follow, like, comment, etc.|
| 4     | Feed algorithm        | Better ranking when data exists  |
| 5     | Notifications        | After real events exist          |

Reason: we want the app to become **testable** as fast as possible: auth works, upload works, videos appear, and creators get real interactions. After that, feed depth and notifications make sense.
