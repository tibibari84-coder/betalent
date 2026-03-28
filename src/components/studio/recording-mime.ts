import type { AllowedVideoMimeType } from '@/constants/upload';
import { isAllowedMimeType } from '@/constants/upload';

/**
 * Build upload MIME for a recorded blob. Some browsers omit `blob.type`; fall back to the
 * recorder’s file extension so the `File` does not declare `video/webm` for MP4 bytes (init/PUT mismatch).
 */
export function mimeForRecordedStudioBlob(blob: Blob, fileExt: 'mp4' | 'webm'): AllowedVideoMimeType {
  const raw = blob.type?.trim();
  if (raw) {
    const base = raw.split(';')[0].trim().toLowerCase();
    if (isAllowedMimeType(base)) return base as AllowedVideoMimeType;
  }
  return fileExt === 'mp4' ? 'video/mp4' : 'video/webm';
}
