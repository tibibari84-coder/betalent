/**
 * Operational domain events (not product analytics). Emitted as structured JSON when BT_OPS_LOG=1.
 */

import { logger } from '@/lib/logger';

export type OpsEventName =
  | 'upload_started'
  | 'upload_completed'
  | 'upload_failed'
  | 'processing_started'
  | 'processing_ready'
  | 'processing_failed'
  | 'vote_attempt'
  | 'vote_blocked_self'
  | 'vote_success'
  | 'gift_attempt'
  | 'gift_success'
  | 'gift_failed'
  | 'like_success'
  | 'like_duplicate_collision'
  | 'comment_created'
  | 'publish_started'
  | 'publish_success'
  | 'publish_failed'
  | 'gift_idempotency_conflict'
  | 'gift_duplicate_attempt'
  | 'client_runtime_error'
  | 'api_stale_upload_scan';

/** Enable with BT_OPS_LOG=1 on Vercel (or locally) for domain + API request telemetry. */
const ENABLED = () => process.env.BT_OPS_LOG === '1';

export function logOpsEvent(event: OpsEventName, fields: Record<string, unknown> = {}) {
  if (!ENABLED()) return;
  logger.info('ops_event', { event, ...fields });
}

export function logOpsAbuse(signal: string, fields: Record<string, unknown> = {}) {
  if (!ENABLED()) return;
  logger.warn('ops_abuse_signal', { signal, ...fields });
}
