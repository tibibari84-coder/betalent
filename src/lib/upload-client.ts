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
  /** Required — ORIGINAL vs COVER (or REMIX for legacy callers). */
  contentType: ContentTypeUpload;
  commentPermission?: CommentPermissionUpload;
  /** When set, server may allow up to live-challenge duration if the challenge is open. */
  challengeSlug?: string;
  /** Optional; stored when contentType is COVER. */
  coverOriginalArtistName?: string;
  coverSongTitle?: string;
};

/** Chain: Upload → Save → Process → Thumbnail → READY → Feed → Open Performance. */
export type DirectUploadResult =
  | { ok: true; videoId: string; ready: boolean }
  | { ok: false; message: string; step?: string; code?: string };

/** YouTube-style pipeline phases after Publish (init → PUT → complete). */
export type UploadPipelineStep = 'initializing' | 'uploading' | 'finalizing';

export type DirectUploadOptions = {
  onProgress?: (percent: number) => void;
  onStatus?: (step: UploadPipelineStep) => void;
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientNetworkError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed') ||
    lower.includes('aborted') ||
    lower.includes('timeout')
  );
}

/** Cross-origin PUT often fails as opaque "Failed to fetch" — usually R2/S3 bucket CORS, not missing "S3 API" in the browser. */
function messageForPresignedPutFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return (
      'Upload blocked: browser could not reach object storage (often R2 bucket CORS). ' +
      'In Cloudflare R2 → your bucket → Settings → CORS: allow your app origin (e.g. http://localhost:3000), ' +
      'methods PUT and HEAD, and Allowed Headers including Content-Type. ' +
      'The app does not use S3 SDK in the browser — only this PUT to the presigned URL.'
    );
  }
  if (raw.includes('Storage PUT failed')) return raw;
  return raw.trim() ? raw : 'Upload failed while sending the file to storage.';
}

/**
 * PUT file bytes to the presigned storage URL.
 * Uses a single `fetch` with `File` as body (no ReadableStream / duplex) — streaming PUT hangs or fails on several mobile browsers.
 */
async function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  onProgress?.(5);
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

/** One automatic retry on transient mobile/network failures (same direct PUT). */
async function putFileToPresignedUrlWithRetry(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await putFileToPresignedUrl(uploadUrl, file, contentType, onProgress);
      return;
    } catch (e) {
      lastErr = e;
      if (attempt === 0 && isTransientNetworkError(e)) {
        if (typeof console !== 'undefined') {
          console.warn('[performDirectUpload] PUT transient error, retrying once', e);
        }
        onProgress?.(0);
        await sleep(650);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function postUploadComplete(videoId: string, storageKey?: string): Promise<Response> {
  return fetch('/api/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      ...(storageKey ? { storageKey } : {}),
    }),
  });
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
  if (!file || file.size < 1) {
    return { ok: false, message: 'Recording file is empty. Please record again.', step: 'init' };
  }
  const mimeType = getMimeTypeForUpload(file);
  if (!mimeType) {
    return { ok: false, message: 'Unsupported file type. Use MP4, MOV, M4V, WebM, or a supported audio file.', step: 'init' };
  }

  options?.onStatus?.('initializing');
  const durationSecInt = Math.max(1, Math.round(Number(metadata.durationSec) || 1));

  const initRes = await fetch('/api/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption: metadata.description?.trim() || metadata.title.trim(),
      hashtags: undefined,
      vocalStyle: metadata.categorySlug,
      title: metadata.title.trim(),
      description: metadata.description?.trim() || undefined,
      categorySlug: metadata.categorySlug,
      contentType: metadata.contentType,
      commentPermission: metadata.commentPermission ?? 'EVERYONE',
      filename: file.name,
      fileSize: file.size,
      mimeType: mimeType as AllowedVideoMimeType,
      durationSec: durationSecInt,
      ...(metadata.challengeSlug?.trim()
        ? { challengeSlug: metadata.challengeSlug.trim() }
        : {}),
      ...(metadata.contentType === 'COVER'
        ? {
            coverOriginalArtistName: metadata.coverOriginalArtistName?.trim() || undefined,
            coverSongTitle: metadata.coverSongTitle?.trim() || undefined,
          }
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
      return { ok: false, message: 'Login required', step: 'init' };
    }
    if (initParsed.status === 403) {
      return {
        ok: false,
        message: initParsed.message || 'Verify your email before uploading performances.',
        step: 'init',
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
      step: 'init',
      code: initParsed.code,
    };
  }

  const initData = initParsed.data;
  const uploadUrl = initData.uploadUrl;
  const videoId = initData.videoId;
  const storageKeyFromInit = initData.storageKey?.trim();
  /** Must match what was signed in PutObject (server returns normalized MIME). */
  const putContentType = (initData.contentType || mimeType).trim();

  if (!uploadUrl || !videoId) {
    return { ok: false, message: 'Upload could not start. Please try again.', step: 'init' };
  }

  options?.onStatus?.('uploading');
  options?.onProgress?.(0);
  try {
    await putFileToPresignedUrlWithRetry(uploadUrl, file, putContentType, options?.onProgress);
  } catch (e) {
    const msg = messageForPresignedPutFailure(e);
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[performDirectUpload] PUT failed', { error: e, message: msg });
    }
    return { ok: false, message: msg, step: 'put' };
  }

  options?.onStatus?.('finalizing');
  let completeParsed = await interpretApiResponse<{ ready?: boolean; step?: string }>(
    await postUploadComplete(videoId, storageKeyFromInit)
  );

  if (!completeParsed.ok) {
    if (completeParsed.status >= 500) {
      if (typeof console !== 'undefined') {
        console.warn('[performDirectUpload] complete returned 5xx, retrying twice', {
          status: completeParsed.status,
          videoId,
        });
      }
      await sleep(700);
      completeParsed = await interpretApiResponse<{ ready?: boolean; step?: string }>(
        await postUploadComplete(videoId, storageKeyFromInit)
      );
    }
    if (!completeParsed.ok && completeParsed.status >= 500) {
      await sleep(1200);
      completeParsed = await interpretApiResponse<{ ready?: boolean; step?: string }>(
        await postUploadComplete(videoId, storageKeyFromInit)
      );
    }
  }

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
      step: completeParsed.step ?? 'complete',
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
