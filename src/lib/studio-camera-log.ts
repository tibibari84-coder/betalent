'use client';

/**
 * Client-only structured logs for studio camera (stdout / devtools; optional log drains).
 */

export type StudioCameraLogEvent =
  | 'camera_permission_requested'
  | 'camera_permission_granted'
  | 'camera_permission_denied'
  | 'camera_environment_blocked'
  | 'microphone_permission_denied'
  | 'camera_retry'
  | 'camera_reset'
  | 'camera_initialized'
  | 'recording_started'
  | 'recording_stopped'
  | 'recording_auto_stopped'
  | 'recording_failed'
  | 'publish_clicked'
  | 'redirected_to_feed'
  | 'video_deleted'
  | 'video_delete_failed';

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
