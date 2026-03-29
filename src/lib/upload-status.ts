const STALE_UPLOADING_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Map video upload/processing state to a short label for creator-facing badges.
 * Pipeline: UPLOADING → UPLOADED → PENDING_PROCESSING → GENERATING_THUMBNAIL → PROCESSING_AUDIO → ANALYZING_AUDIO → READY.
 * Used on own profile and my-videos. Public feed never shows non-READY content.
 * If uploadStatus is UPLOADING and createdAt is older than 10 min, treats as stale and returns "Upload failed".
 */
export function getVideoProcessingLabel(
  uploadStatus: string,
  processingStatus: string,
  createdAt?: Date | string | null
): string | null {
  if (uploadStatus === 'UPLOADING') {
    if (createdAt) {
      const age = Date.now() - new Date(createdAt).getTime();
      if (age > STALE_UPLOADING_MS) return 'Upload failed';
    }
    return 'Uploading…';
  }
  if (uploadStatus === 'FAILED') return 'Upload failed';
  if (uploadStatus === 'DRAFT') return 'Draft';
  if (uploadStatus === 'UPLOADED' && processingStatus === 'PENDING_PROCESSING') return 'Uploaded';

  switch (processingStatus) {
    case 'PENDING_PROCESSING':
      return 'Processing…';
    case 'GENERATING_THUMBNAIL':
      return 'Generating thumbnail…';
    case 'PROCESSING_AUDIO':
      return 'Enhancing audio…';
    case 'ANALYZING_AUDIO':
      return 'Analyzing audio…';
    case 'CHECKING_INTEGRITY':
      return 'Checking…';
    case 'READY':
      return 'Ready';
    case 'PROCESSING_FAILED':
      return 'Failed';
    case 'FLAGGED':
      return 'Review required';
    case 'PENDING':
    case 'PROCESSING':
      return 'Processing…';
    case 'FAILED':
      return 'Failed';
    default:
      return null;
  }
}
