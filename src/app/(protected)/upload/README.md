# Upload flow

## Creator test flow (full chain)

**Upload → Save → Process → Thumbnail → READY → Feed → Open Performance**

| Step | What it is | If missing |
|------|------------|------------|
| **upload** | Client sends file; init + PUT + complete called | Init failed, auth, or PUT failed (network). Error response includes `step: 'upload'`. |
| **save** | Video record created/updated in DB (videoUrl, storageKey) | Init/complete validation or DB error. `step: 'save'`. |
| **storage** | File in bucket; playback URL available | Storage not configured (503) or getPlaybackUrl failed. `step: 'storage'`. |
| **process** | processingStatus set; thumbnail step run | Complete handler threw. `step: 'process'`. |
| **thumbnail** | Thumbnail generated or skipped; status → ANALYZING_AUDIO or PROCESSING_FAILED | Handled inside complete; on failure we still mark READY so chain continues. |
| **READY** | status = READY, moderationStatus = APPROVED | Set in complete when analysis not enqueued or thumbnail failed/stuck. If analysis enqueued, worker sets READY later; API returns `ready: false`. |
| **Feed** | For-you feed returns READY + APPROVED only | No missing link if READY is set. |
| **Open Performance** | `/video/[id]` loads via getVideoById (READY only) | Use "View performance" only when `ready: true`; else "My videos". |

When the chain does not complete, the API or client returns `step` so you know exactly which step is missing.

## Creation flow (record-first, unified)

- Opening the creation flow shows **Recording Studio** by default (record-first).
- User fills metadata (title, style, etc.) and enters the live room to record.
- Studio recordings produce a `File` and land in the same metadata + publish form.
- "Upload from library instead" switches to device upload (`UploadDropzone`).
- Both record and device paths use the same metadata form and `performDirectUpload()` pipeline.

## Key files

- `page.tsx` – form state, validation, submit; record-first creation with device upload as secondary.
- `@/components/upload/UploadDropzone.tsx` – device storage file picker (library upload UI).
- `@/lib/upload-client.ts` – `performDirectUpload(file, metadata, options)` (shared); `createFileForUpload(blob, filename, mimeType)` for Recording Studio output.
- `@/constants/upload.ts` – MIME/size limits, `UploadSourceType`, `ENABLED_UPLOAD_SOURCES`.
