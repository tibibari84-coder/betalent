'use client';

/**
 * Thin Permissions API helper for camera. Primary studio flow uses `useCameraStream` +
 * `classifyGetUserMediaFailure` — this is optional for diagnostics or future UI.
 */
export async function queryCameraPermissionApi(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
