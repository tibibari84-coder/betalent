/**
 * Direct video upload: validation and limits.
 */

import { MAX_VIDEO_FILE_SIZE_BYTES } from './app';
import {
  getRecordingMaxDurationSec,
} from './recording-modes';

/** Allowed MIME types for video upload. */
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-m4v',
  /** Browser MediaRecorder (Chrome/Firefox/Edge) — Studio recordings */
  'video/webm',
] as const;

/** Accept attribute for file input: specific types + video/* for iOS Photos/Files and desktop. */
export const FILE_INPUT_ACCEPT =
  [...ALLOWED_VIDEO_MIME_TYPES, 'video/*'].join(',');

export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export const ALLOWED_VIDEO_MIME_SET = new Set<string>(ALLOWED_VIDEO_MIME_TYPES);

/** Strip parameters (e.g. `;codecs=...`) so MediaRecorder `File.type` matches allowed set. */
export function normalizeVideoMimeType(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_VIDEO_MIME_SET.has(normalizeVideoMimeType(mime));
}

/** Allowed video extensions (lowercase). */
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

/** Infer MIME from filename for clients that omit type (e.g. iOS Photos). Only for allowed extensions. */
export function mimeFromFilename(name: string): AllowedVideoMimeType | '' {
  const lower = name.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));
  if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) return '';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.m4v') return 'video/x-m4v';
  if (ext === '.webm') return 'video/webm';
  return 'video/mp4';
}

/** MIME for upload: use file.type if allowed, else infer from filename (iOS-safe). Empty if unsupported. */
export function getMimeTypeForUpload(file: File): AllowedVideoMimeType | '' {
  if (file.type && isAllowedMimeType(file.type)) {
    return normalizeVideoMimeType(file.type) as AllowedVideoMimeType;
  }
  return mimeFromFilename(file.name);
}

/** Max file size in bytes (from app constant). */
export const MAX_VIDEO_FILE_SIZE = MAX_VIDEO_FILE_SIZE_BYTES;

/**
 * Hard platform cap for standard uploads (90 seconds).
 * Recording Studio auto-stops at this cap.
 */
export const MAX_PLATFORM_UPLOAD_DURATION_SEC = getRecordingMaxDurationSec('standard');

/**
 * Live-challenge slot length (150 seconds).
 */
export const LIVE_CHALLENGE_MAX_DURATION_SEC_FUTURE = getRecordingMaxDurationSec('live');


/** Presigned URL expiry for upload (seconds). */
export const UPLOAD_PRESIGN_EXPIRES_SEC = 60 * 60; // 1 hour

/**
 * How video bytes enter the direct-upload pipeline (API / validation).
 * Product UI is camera-first only; the resulting `File` still tags as `record` where used.
 */
export type UploadSourceType = 'file' | 'camera' | 'record';

/** Legacy identifier — manual file picker removed from creator UI. */
export const UPLOAD_SOURCE_FILE: UploadSourceType = 'file';
export const UPLOAD_SOURCE_CAMERA: UploadSourceType = 'camera';
export const UPLOAD_SOURCE_RECORD: UploadSourceType = 'record';

/** Enabled sources for this build (creator flow = studio / record only). */
export const ENABLED_UPLOAD_SOURCES: readonly UploadSourceType[] = [UPLOAD_SOURCE_RECORD];
