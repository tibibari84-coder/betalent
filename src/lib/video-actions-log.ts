export type VideoActionLogEvent = 'video_delete_started' | 'video_deleted' | 'video_delete_failed';

export function logVideoAction(event: VideoActionLogEvent, fields?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    console.info(
      JSON.stringify({
        source: 'video_actions',
        event,
        ts: new Date().toISOString(),
        ...fields,
      })
    );
  } catch {
    /* ignore */
  }
}
