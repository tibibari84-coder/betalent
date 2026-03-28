'use client';

/**
 * Client-only structured logs for studio camera (stdout / devtools; optional log drains).
 */

export type StudioCameraLogEvent =
  | 'camera_permission_denied'
  | 'microphone_permission_denied'
  | 'camera_retry'
  | 'camera_initialized';

export function logStudioCamera(event: StudioCameraLogEvent, fields?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    console.info(
      JSON.stringify({
        source: 'studio_camera',
        event,
        ts: new Date().toISOString(),
        ...fields,
      })
    );
  } catch {
    /* ignore */
  }
}
