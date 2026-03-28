/**
 * Client-side direct video upload: init → PUT to presigned URL → complete.
 *
 * Client direct upload: presigned PUT from browser (Studio `File` or internal callers).
 * Phase 2: Same pipeline for File from camera capture or MediaRecorder (camera+mic).
 * Do not change this pipeline for Phase 2; only pass a File from the new source.
 */

import { getMimeTypeForUpload } from '@/constants/upload';
import type { AllowedVideoMimeType } from '@/constants/upload';
import { interpretApiResponse } from '@/lib/api-json-client';

export type ContentTypeUpload = 'ORIGINAL' | 'COVER' | 'REMIX';
export type CommentPermissionUpload = 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';

export type DirectUploadMetadata = {
  title: string;
  description?: string;
  categorySlug: string;
  durationSec: number;
  contentType?: ContentTypeUpload;
  commentPermission?: CommentPermissionUpload;
  /** When set, server may allow up to live-challenge duration if the challenge is open. */
  challengeSlug?: string;
};

/** Chain: Upload → Save → Process → Thumbnail → READY → Feed → Open Performance. */
export type DirectUploadResult =
  | { ok: true; videoId: string; ready: boolean }
  | { ok: false; message: string; step?: string; code?: string };

export type UploadProgressStep = 'preparing' | 'uploading' | 'processing';

export type DirectUploadOptions = {
  onProgress?: (percent: number) => void;
  onStatus?: (step: UploadProgressStep) => void;
};

function normalizeUploadMessage(message: string | undefined, step?: string): string {
  const raw = (message ?? '').toLowerCase();
  if (step === 'storage' || raw.includes('storage') || raw.includes('direct upload is not configured')) {
    return 'Upload service is temporarily unavailable. Please try again.';
  }
  if (raw.includes('playback url') || raw.includes('failed to get playback')) {
    return 'Playback is not ready yet (or storage URL is missing). Wait a minute and check My videos, or try uploading again.';
  }
  if (raw.includes('complete failed') || raw.includes('upload_complete_failed')) {
    return 'We could not finish processing your video after upload. Try again or use another file.';
  }
  if (raw.includes('upload not in progress')) {
    return 'This upload session expired. Please start a new upload.';
  }
  if (raw.includes('forbidden')) {
    return 'You are not allowed to complete this upload. Check that you are signed in as the right account.';
  }
  if (raw.includes('invalid file type')) {
    return 'Unsupported file type. Use MP4, MOV, M4V, WebM, or a supported audio file.';
  }
  if (raw.includes('file too large')) {
    return 'This file is too large for upload. Please choose a smaller file.';
  }
  if (raw.includes('max duration')) {
    return 'This take is too long for the current upload limit.';
  }
  if (raw.includes('network')) {
    return 'Network issue while uploading. Check your connection and try again.';
  }
  if (raw.includes('too many') && raw.includes('completion')) {
    return 'Too many finish attempts. Please wait a few minutes and try again.';
  }
  return message?.trim() || 'Upload failed. Please try again.';
}

type InitSuccessBody = {
  ok: true;
  uploadUrl: string;
  videoId: string;
  storageKey?: string;
  /** Normalized video MIME from server — must match PUT Content-Type with presigned URL. */
  contentType?: string;
};

/**
 * PUT file bytes to the presigned storage URL. Uses fetch (required for R2/S3 CORS parity).
 * Progress uses a ReadableStream when supported; otherwise uploads the whole File without byte progress.
 */
async function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const canStream = typeof ReadableStream !== 'undefined' && typeof file.stream === 'function';

  if (canStream && onProgress) {
    try {
      const reader = file.stream().getReader();
      const total = Math.max(1, file.size);
      let loaded = 0;
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          loaded += value.byteLength;
          onProgress(Math.min(99, Math.round((loaded / total) * 100)));
          controller.enqueue(value);
        },
      });
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: body as BodyInit,
        headers: { 'Content-Type': contentType },
        credentials: 'omit',
        mode: 'cors',
        duplex: 'half',
      } as RequestInit);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Storage PUT failed (${res.status}): ${errText.slice(0, 240)}`);
      }
      onProgress(100);
      return;
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[putFileToPresignedUrl] streaming PUT failed, retrying with full body', e);
      }
    }
  }

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
    credentials: 'omit',
    mode: 'cors',
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Storage PUT failed (${res.status}): ${errText.slice(0, 240)}`);
  }
  onProgress?.(100);
}

/**
 * Run the full direct upload: POST /api/upload/init, PUT file to presigned URL, POST complete.
 * Accepts `File` from `createFileForUpload(blob, …)` after Recording Studio, or any valid video `File`.
 */
export async function performDirectUpload(
  file: File,
  metadata: DirectUploadMetadata,
  options?: DirectUploadOptions
): Promise<DirectUploadResult> {
  const mimeType = getMimeTypeForUpload(file);
  if (!mimeType) {
    return { ok: false, message: 'Unsupported file type. Use MP4, MOV, M4V, WebM, or a supported audio file.' };
  }

  options?.onStatus?.('preparing');
  const durationSecInt = Math.max(1, Math.round(Number(metadata.durationSec) || 1));

  const initRes = await fetch('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: metadata.title.trim(),
      description: metadata.description?.trim() || undefined,
      categorySlug: metadata.categorySlug,
      contentType: metadata.contentType ?? 'ORIGINAL',
      commentPermission: metadata.commentPermission ?? 'EVERYONE',
      filename: file.name,
      fileSize: file.size,
      mimeType: mimeType as AllowedVideoMimeType,
      durationSec: durationSecInt,
      ...(metadata.challengeSlug?.trim()
        ? { challengeSlug: metadata.challengeSlug.trim() }
        : {}),
    }),
  });
  const initParsed = await interpretApiResponse<InitSuccessBody>(initRes);

  if (!initParsed.ok) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[performDirectUpload] init failed', {
        status: initParsed.status,
        code: initParsed.code,
        step: initParsed.step,
        message: initParsed.message,
        mimeType,
        fileSize: file.size,
        durationSec: durationSecInt,
      });
    }
    if (initParsed.status === 401) {
      return { ok: false, message: 'Login required', step: 'upload' };
    }
    if (initParsed.status === 403) {
      return {
        ok: false,
        message: initParsed.message || 'Verify your email before uploading performances.',
        step: 'upload',
      };
    }
    if (initParsed.status === 503) {
      return {
        ok: false,
        message: 'Upload service is temporarily unavailable. Please try again.',
        step: 'storage',
      };
    }
    return {
      ok: false,
      message: normalizeUploadMessage(initParsed.message, 'save'),
      step: 'save',
      code: initParsed.code,
    };
  }

  const initData = initParsed.data;
  const uploadUrl = initData.uploadUrl;
  const videoId = initData.videoId;
  /** Must match what was signed in PutObject (server returns normalized MIME). */
  const putContentType = (initData.contentType || mimeType).trim();

  if (!uploadUrl || !videoId) {
    return { ok: false, message: 'Upload could not start. Please try again.' };
  }

  options?.onStatus?.('uploading');
  options?.onProgress?.(0);
  try {
    await putFileToPresignedUrl(uploadUrl, file, putContentType, options?.onProgress);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[performDirectUpload] PUT failed', { message: msg });
    }
    return {
      ok: false,
      message: msg.includes('failed') ? msg : `Upload failed: ${msg}`,
      step: 'upload',
    };
  }

  options?.onStatus?.('processing');
  const completeRes = await fetch('/api/videos/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });
  const completeParsed = await interpretApiResponse<{ ready?: boolean; step?: string }>(completeRes);

  if (!completeParsed.ok) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[performDirectUpload] complete failed', {
        status: completeParsed.status,
        code: completeParsed.code,
        step: completeParsed.step,
        message: completeParsed.message,
        videoId,
      });
    }
    return {
      ok: false,
      message: normalizeUploadMessage(completeParsed.message, completeParsed.step),
      step: completeParsed.step,
      code: completeParsed.code,
    };
  }

  const completeData = completeParsed.data;
  return { ok: true, videoId, ready: completeData.ready === true };
}

/**
 * Phase 2 helper: build a File from a Blob (e.g. MediaRecorder output) for performDirectUpload.
 * Use an allowed MIME type (video/mp4, video/quicktime, video/x-m4v) so the server accepts it.
 */
export function createFileForUpload(
  blob: Blob,
  filename: string,
  mimeType: AllowedVideoMimeType
): File {
  return new File([blob], filename, { type: mimeType });
}
