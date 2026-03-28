/**
 * Structured client-side events for the publish → feed handoff flow.
 * Extend with analytics / observability without changing call sites.
 */

export type UploadFlowEventName =
  | 'publish_clicked'
  | 'upload_started'
  | 'upload_background'
  | 'upload_completed'
  | 'upload_failed'
  | 'redirected_to_feed';

export function logUploadFlowEvent(name: UploadFlowEventName, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  console.info('[upload-flow]', name, { ...data, t: Date.now() });
}

/** Session handoff: feed reads this to show “your video” banner (Option B–lite). */
export const BETALENT_POST_PUBLISH_HANDOFF_KEY = 'betalent_post_publish_handoff';

export type PostPublishHandoffPayload = {
  videoId: string;
  ready: boolean;
  at: number;
};

export function writePostPublishHandoff(payload: PostPublishHandoffPayload): void {
  try {
    sessionStorage.setItem(BETALENT_POST_PUBLISH_HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
