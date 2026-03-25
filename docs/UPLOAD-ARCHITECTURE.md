# BeTalent Direct Video Upload Architecture

## Overview

BeTalent supports **direct video upload** to object storage (Cloudflare R2 / S3-compatible). The app does not stream file bytes through the server; it issues presigned URLs and the client uploads directly to storage.

**Deprecated / removed:**
- `POST /api/videos/upload` — 410 Gone. Use direct upload instead.
- `POST /api/upload` (FormData) — 410 Gone. Local/mock storage removed; all uploads use R2 via `/api/upload/init` → presigned PUT → `/api/videos/upload/complete`.

## Flow

1. Creator selects a local video file and fills title, style (required), and optional description.
2. Client validates file (type, size, duration) and calls **POST /api/upload/init** with metadata.
3. Server creates a `Video` record in `UPLOADING` state and returns a **presigned PUT URL** and `videoId`.
4. Client uploads the file with **PUT** to the presigned URL (with progress).
5. Client calls **POST /api/videos/upload/complete** with `videoId`.
6. Server sets `videoUrl` (playback URL), `uploadStatus = UPLOADED`, `status = READY`, and triggers post-upload processing (e.g. audio analysis).

## Storage (R2 / S3-compatible)

- **Config**: `src/lib/storage/config.ts` reads env and exposes `getStorageConfig()` / `isStorageConfigured()`.
- **Keys**: `videos/{userId}/{videoId}.{ext}` (see `src/lib/storage/keys.ts`).
- **Presign**: `getPresignedUploadUrl(storageKey, contentType, expiresIn)` and `getPlaybackUrl(storageKey)` in `src/lib/storage/presign.ts`.

### Environment variables

Set these for direct upload to work (otherwise init returns 503):

| Variable | Description |
|---------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_URL` | **Required for production.** Public base URL for playback (e.g. `https://pub-xxx.r2.dev` or custom domain). If unset, playback uses presigned GET URLs that expire in 24h. |

## Database (Video model)

- **uploadStatus**: `DRAFT` \| `UPLOADING` \| `UPLOADED` \| `FAILED`
- **processingStatus**: `PENDING` \| `PROCESSING` \| `READY` \| `FAILED`
- **moderationStatus**: `PENDING` \| `APPROVED` \| `FLAGGED` \| `BLOCKED`
- **storageKey**: Object key in bucket (set at init).
- **videoUrl**: Playback URL (set on complete; optional until then).
- **fileSize**, **mimeType**: Set at init for validation and display.

## Validation

- **Server (init)**: Allowed MIME (video/mp4, video/quicktime, video/x-m4v), max file size (see `MAX_VIDEO_FILE_SIZE`), max duration (per-user tier), title, style (category slug).
- **Client**: Same checks before calling init; duration from `<video>` metadata.

## Processing pipeline readiness

After **complete**, the video is `READY` and visible. The system is prepared for:

- Thumbnail extraction (future job reading `storageKey` / `videoUrl`).
- Audio analysis (`enqueueAnalysis` is called; uses `videoUrl`).
- Moderation / integrity (status fields and optional `MediaIntegrityAnalysis`).

No new pipeline steps are implemented here; only the model and statuses are in place.

## Security

- Init and complete require **authenticated** user.
- Init validates **file type and size** and **category** server-side.
- Presigned URL is **short-lived** (default 1 hour) and scoped to the generated `storageKey`.
- Complete verifies **ownership** and state (`uploadStatus === UPLOADING`).

## Error handling

- Init: 400 for invalid input, 503 if storage is not configured.
- Complete: 404/403 for missing or wrong owner, 400 if not in `UPLOADING`; on storage failure (e.g. `getPlaybackUrl` fails), record is set to `uploadStatus: FAILED` and client receives 500 with `step: 'storage'`.
- Client: `performDirectUpload` maps server errors to user-friendly messages (e.g. 503 → "Upload service temporarily unavailable").

## Verification (R2 wired end-to-end)

1. **performDirectUpload** (`@/lib/upload-client`) — init → PUT to presigned URL → complete.
2. **Presigned URLs** (`@/lib/storage/presign`) — R2 S3-compatible endpoint; PUT for upload, GET/public for playback.
3. **videoUrl storage** — Set on complete from `getPlaybackUrl(storageKey)`; uses `R2_PUBLIC_URL` when set for permanent URLs.
4. **Feed filtering** — `CANONICAL_PUBLIC_VIDEO_WHERE` includes `videoUrl: { not: null }`; only playback-ready videos appear.
5. **No local storage** — `POST /api/upload` returns 410; all uploads go to R2.
