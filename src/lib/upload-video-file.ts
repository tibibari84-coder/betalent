import { getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';

const DURATION_METADATA_TIMEOUT_MS = 5000;

/** Read duration from a video file (client-only). Used by dropzone + inline library picker. */
export function processVideoFileWithDuration(
  f: File,
  onFileSelect: (file: File, durationSec: number) => void,
  onDurationLoaded?: (sec: number) => void
) {
  if (!getMimeTypeForUpload(f) || f.size > MAX_VIDEO_FILE_SIZE) {
    onFileSelect(f, 0);
    return;
  }
  const url = URL.createObjectURL(f);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.playsInline = true;
  video.muted = true;
  let settled = false;
  const settle = (sec: number) => {
    if (settled) return;
    settled = true;
    URL.revokeObjectURL(url);
    onFileSelect(f, sec);
    onDurationLoaded?.(sec);
  };
  const timeoutId = window.setTimeout(() => settle(1), DURATION_METADATA_TIMEOUT_MS);
  video.onloadedmetadata = () => {
    window.clearTimeout(timeoutId);
    settle(Math.ceil(video.duration) || 1);
  };
  video.onerror = () => {
    window.clearTimeout(timeoutId);
    settle(1);
  };
  video.src = url;
}
