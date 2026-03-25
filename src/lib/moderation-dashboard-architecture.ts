/**
 * BETALENT Moderation Dashboard Architecture – internal admin & trust & safety tooling.
 *
 * This module documents the moderation system design. Implementation lives in:
 * - app/(protected)/moderation/page.tsx (dashboard UI)
 * - services/moderation-queue.service.ts (queues, detail views)
 * - services/moderation-action.service.ts (actions, audit)
 * - app/api/moderation/* (queues, detail, actions, notes, logs, audit)
 * - Prisma: ModerationActionLog, ModerationNote, SupportReviewFlag, MediaIntegrityAnalysis, AccountRiskProfile
 *
 * Layout: existing dimensions, container width, and section sizes must not change.
 * Only moderation functionality is added or extended.
 */

// ---------------------------------------------------------------------------
// 1. CORE GOAL
// ---------------------------------------------------------------------------

/**
 * The moderation dashboard supports fair and safe platform operations.
 * Moderators can: see review queues, inspect suspicious content and accounts,
 * inspect support abuse patterns, take actions, leave notes, and track status.
 * All actions are auditable (ModerationActionLog, ModerationNote).
 */

// ---------------------------------------------------------------------------
// 2. MAIN REVIEW QUEUES
// ---------------------------------------------------------------------------

/**
 * A. Suspicious Videos – integrity/moderation status, AI voice, duplicate risk, flag reason.
 * B. Suspicious Accounts – risk level, linked accounts, suspicious support count, trust status.
 * C. Suspicious Support Activity – pending SupportReviewFlag; sender/receiver, amount, risk, ranking impact.
 * D. AI Voice / Integrity Review – high AI voice risk or FLAGGED; comparison candidates.
 * E. Duplicate / Stolen Media – originality status, duplicate risk; comparison candidates.
 * F. Challenge Fairness – entries with suspicious support or integrity issues; exclude/freeze/disqualify.
 * G. Verification Requests – creator verification pending (separate queue).
 *
 * Queues are filterable by: risk level, moderation status, integrity status, date range,
 * creator, challenge, payout-blocked. Search: username, video title, challenge, target id.
 */

export const MODERATION_QUEUE_IDS = [
  'suspicious_videos',
  'suspicious_accounts',
  'suspicious_support',
  'ai_integrity',
  'duplicate_media',
  'challenge_fairness',
  'verification_requests',
] as const;

// ---------------------------------------------------------------------------
// 3. VIDEO REVIEW QUEUE (item shape)
// ---------------------------------------------------------------------------

/**
 * Per item: video thumbnail, creator, upload date, style, AI vocal summary,
 * integrity status, duplicate risk, flag reason, moderation status.
 * Statuses: PENDING_REVIEW (PENDING), APPROVED, FLAGGED, LIMITED, REJECTED, BLOCKED.
 */

// ---------------------------------------------------------------------------
// 4. ACCOUNT REVIEW QUEUE (item shape)
// ---------------------------------------------------------------------------

/**
 * Per item: username, account age, risk level, flag count, suspicious support count,
 * linked account cluster size, moderation notes, trust status (CLEAN, WATCHLIST, LIMITED, SUSPENDED, BANNED).
 */

// ---------------------------------------------------------------------------
// 5. SUPPORT FRAUD REVIEW (item shape & actions)
// ---------------------------------------------------------------------------

/**
 * Per item: sender, receiver, support type, amount, timestamp, risk score, reason flagged,
 * linked device/IP signals if available, ranking impact (included/excluded).
 * Actions: validate support, exclude from ranking, void support, escalate, freeze payout.
 */

// ---------------------------------------------------------------------------
// 6. AI / INTEGRITY REVIEW (item shape & actions)
// ---------------------------------------------------------------------------

/**
 * Per item: video, creator, AI voice suspicion score, duplicate risk, originality status,
 * moderation recommendation, comparison candidates (potential duplicates).
 * Actions: approve, flag for deeper review, reject, block monetization, block challenge entry, remove content.
 */

// ---------------------------------------------------------------------------
// 7. CHALLENGE FAIRNESS REVIEW (item shape & actions)
// ---------------------------------------------------------------------------

/**
 * Reviews: suspicious support spikes, abnormal ranking changes, suspicious clusters,
 * duplicate submissions, low-integrity finalists.
 * Actions: exclude suspicious support from challenge ranking, freeze entry, disqualify entry,
 * send to review, restore if cleared.
 */

// ---------------------------------------------------------------------------
// 8. DETAIL VIEW CONTRACT
// ---------------------------------------------------------------------------

/**
 * Every queue item opens a detailed review view (right panel or modal).
 * Detail view may include: full performance info, creator profile summary, support history,
 * trust signals, moderation event history, notes, recommended actions.
 * Moderator makes the final decision and can add a note with every action.
 */

// ---------------------------------------------------------------------------
// 9. MODERATION ACTIONS (mapped to ModerationActionType)
// ---------------------------------------------------------------------------

/**
 * Content: APPROVE, FLAG, LIMIT_DISCOVERY, REMOVE_FROM_CHALLENGE, BLOCK_VIDEO, DELETE_VIDEO.
 * Account: WARN, WATCHLIST, RESTRICT_SUPPORT, SUSPEND, BAN, CLEAR_RISK_STATE.
 * Support: VALIDATE_SUPPORT, EXCLUDE_FROM_RANKING, VOID_SUPPORT, REFUND, SEND_TO_FRAUD_REVIEW, FREEZE_PAYOUT.
 * Challenge entry: EXCLUDE_ENTRY_SUPPORT, FREEZE_ENTRY, DISQUALIFY_ENTRY, RESTORE_ENTRY.
 * Verification: APPROVE_VERIFICATION, REJECT_VERIFICATION, REVOKE_VERIFICATION, REQUEST_MORE_INFO.
 * No silent actions; every action creates a ModerationActionLog entry.
 */

// ---------------------------------------------------------------------------
// 10. AUDIT TRAIL
// ---------------------------------------------------------------------------

/**
 * ModerationActionLog: id, moderatorId, targetType, targetId, actionType,
 * previousStatus, newStatus, note, createdAt.
 * ModerationNote: id, moderatorId, targetType, targetId, note, createdAt.
 * Logs and notes are exposed via /api/moderation/logs and /api/moderation/notes.
 * Filters: search (moderator or target id), targetType, dateFrom, dateTo.
 */

// ---------------------------------------------------------------------------
// 11. FILTERS & SEARCH
// ---------------------------------------------------------------------------

/**
 * Filters: riskLevel, queueType (implicit), moderationStatus, integrityStatus,
 * dateFrom, dateTo, creatorId, challengeId, payoutBlocked.
 * Search: username, video title, challenge slug/title, moderation id / target id.
 * Applied in getModerationQueue by queue type; cursor-based pagination preserved.
 */
