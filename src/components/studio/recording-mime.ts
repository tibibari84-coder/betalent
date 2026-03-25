import type { AllowedVideoMimeType } from '@/constants/upload';
import { isAllowedMimeType } from '@/constants/upload';

export function normalizeRecorderMime(blobType: string): AllowedVideoMimeType {
  const base = blobType.split(';')[0].trim().toLowerCase();
  if (isAllowedMimeType(base)) return base as AllowedVideoMimeType;
  return 'video/webm';
}
