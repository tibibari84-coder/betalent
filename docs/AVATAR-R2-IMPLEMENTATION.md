# Avatar Storage – Cloudflare R2 Implementation Report

## Summary

Avatar uploads are stored in **Cloudflare R2** (S3-compatible). New uploads go to R2 only; existing users with local URLs (`/uploads/avatars/...`) continue to render if those files exist.

---

## 1. Upload Route

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/users/me/avatar` | POST | Accepts FormData (`file` or `avatar`), validates, uploads to R2, stores URL in DB |

**Behavior:**
- Authenticated user uploads via FormData (`file` or `avatar`)
- Validates MIME type: `image/jpeg`, `image/jpg`, `image/png`, `image/webp` (empty mime rejected)
- Validates size: max 20MB
- Uploads to R2
- Saves durable URL in `User.avatarUrl`
- Returns `{ ok: true, avatarUrl }` on success

---

## 2. R2 Path Structure

```
avatars/{userId}/{uniqueId}.{ext}
```

- `userId` – User ID from the database (safe, from auth)
- `uniqueId` – UUID via `crypto.randomUUID()` (unique filenames, no collisions)
- `ext` – `jpg`, `png`, or `webp` (derived from validated MIME type)

**Examples:**
- `avatars/clxyz123.../a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`
- `avatars/clxyz123.../f9e8d7c6-b5a4-3210-9876-543210fedcba.webp`

---

## 3. Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API token secret |
| `R2_BUCKET_NAME` | Yes | R2 bucket name |
| `R2_PUBLIC_URL` | No | Public base URL for playback (e.g. `https://pub-xxx.r2.dev` or custom domain). If unset, playback uses presigned GET URLs. |

When any required variable is missing, the avatar route returns 503 with `Avatar upload not configured (R2 required)`.

---

## 4. Local Avatar Storage

| Aspect | Status |
|--------|--------|
| **New uploads** | R2 only |
| **Local storage** | Not used for uploads |
| **Backward compatibility** | Kept for display only |

Existing `avatarUrl` values like `/uploads/avatars/rising.jpg` will render if the file exists in `public/uploads/avatars/`. The app does not write to the local filesystem anymore.

---

## 5. Security & Storage Hygiene

- **Unique filenames:** `avatars/{userId}/{uuid}.{ext}`
- **Safe path:** `userId` and `ext` from validated inputs
- **MIME validation:** Only `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Cache-Control:** `public, max-age=3600` on R2 objects

---

## 6. UX

- **Instant preview:** Selected file shown immediately via `URL.createObjectURL()` before upload completes
- **Update after upload:** Success updates avatar via `setProfile` + `router.refresh()`
- **Errors:** Clear messages (e.g. `Invalid file type`, `File too large`, `Upload failed`)
- **Compatibility:** Settings uses `unoptimized` for both `/uploads/` (legacy) and external URLs (R2)
