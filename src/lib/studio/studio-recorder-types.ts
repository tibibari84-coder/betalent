export type StudioCameraPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export type StudioRecorderErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'microphone_permission_denied'
  | 'no_microphone'
  | 'no_camera'
  | 'recorder_not_supported'
  | 'unknown';

/** Result of opening camera + mic preview (used for transition UI + error copy). */
export type StudioPreviewResult =
  | { ok: true }
  | { ok: false; message: string; code: StudioRecorderErrorCode };

export type StudioStreamState = 'idle' | 'loading' | 'ready' | 'failed';

export type StudioTakeResult = {
  blob: Blob;
  mimeType: string;
  fileExt: 'mp4' | 'webm';
  durationSec: number;
};

export type StudioRecorderPhase = 'idle' | 'preview' | 'recording' | 'paused' | 'stopped';
