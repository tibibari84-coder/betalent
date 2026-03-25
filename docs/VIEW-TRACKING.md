# Professional view tracking (BeTalent)

## Owner rule — **Option A (implemented)**

- If the viewer is **logged in** and `viewerUserId === video.creatorId`, the view **does not** increment `viewsCount`.
- **Ranking**: those views never create a `ViewRecord`, so they do not affect public view totals.
- Anonymous viewers cannot be proven to be the owner; only the **canonical public** gate applies (private / non-approved videos are not countable).

## When a view counts

All must hold:

1. Video matches **`CANONICAL_PUBLIC_VIDEO_WHERE`** (READY, APPROVED, PUBLIC, `videoUrl` set, not ranking-disabled, integrity OK).
2. **Engagement**: reported `qualifiedWatchSeconds` ≥ **max(2.5s, 30% of `durationSec`)**, capped at **45s** and never above real duration (+ small slack).
3. **Deduplication**: at most **one** counted view per **viewerKey** (user id or `betalent_sid` session) per video per **24 hours**.
4. Client must send **`qualifiedWatchSeconds`**; simple page load or modal open **does not** count.

## Anti-spam

- **viewerKey**: authenticated users → stable `userId`; guests → HttpOnly **`betalent_sid`** cookie (refresh does not mint a new key until cookie cleared).
- **Cooldown / dedup**: at most **one** counted view per `(viewerKey, videoId)` per **24 hours** (`ViewRecord` lookup). This covers **refresh spam** and repeated opens the same day (stricter than a 30–60s window alone).
- **Client**: `useQualifiedViewTracking` sends **at most one** POST per mount once the engagement threshold is met (`sentRef`), avoiding duplicate requests from scroll flicker when combined with IO ≥ 0.55.
- **Optional audit**: `viewerIpHash` (SHA-256 of salted IP) on `ViewRecord` for forensics; **no** hard IP cap by default (NAT-safe).

## Frontend contract

- **Feed**: `IntersectionObserver` on the player shell + **active** feed item; accumulate **playback time** from `timeupdate` only while visible, active, playing, and tab focused; fire **once** per mount when threshold reached.
- **Detail / modal**: same engagement accumulation; no view on modal open alone.

## Data model

- **`ViewRecord`**: `viewerKey`, `videoId`, `qualifiedWatchSec`, `viewerIpHash?`, `createdAt`.
- **`Video.viewsCount`**: incremented only when `recordView` returns `counted: true`.

## Unique viewers

- Not a separate counter in DB; approximate with `COUNT(DISTINCT viewerKey)` over `ViewRecord` for analytics if needed.
