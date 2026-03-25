/**
 * BETALENT anti-cheat and fraud prevention – rate limits, risk thresholds, self-support policy.
 *
 * Server-enforced. Do not auto-ban on one weak signal; use risk scoring and review.
 * Design: lib/anti-cheat-architecture.ts. Account linking signal keys for FraudEvent.details
 * and moderation action types: Prisma enums (ModerationActionType) and architecture doc.
 */

export const FraudRiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type FraudRiskLevelValue = (typeof FraudRiskLevel)[keyof typeof FraudRiskLevel];

/** Score thresholds (0–100) for risk level. */
export const RISK_SCORE_THRESHOLDS = {
  MEDIUM: 25,
  HIGH: 50,
  CRITICAL: 75,
} as const;

/** Block support actions when risk level >= this. */
export const BLOCK_SUPPORT_AT_RISK_LEVEL: FraudRiskLevelValue = 'CRITICAL';

/** Flag for review when risk level >= this (but still allow if below block). */
export const FLAG_FOR_REVIEW_AT_RISK_LEVEL: FraudRiskLevelValue = 'HIGH';

/** Payout blocked when risk level >= this. */
export const PAYOUT_BLOCK_AT_RISK_LEVEL: FraudRiskLevelValue = 'HIGH';

// ---------------------------------------------------------------------------
// Self-support policy (server-enforced)
// ---------------------------------------------------------------------------

/** Direct super vote to own challenge entry is disallowed. (Already enforced in coin.service.) */
export const SELF_SUPER_VOTE_DISALLOWED = true;

/** Direct gift to own performance is disallowed. (Enforced in gift.service.) */
export const SELF_GIFT_DISALLOWED = true;

/**
 * When true, linked-account suspicious support is flagged and can be excluded from ranking.
 * NOTE: Linked-account detection is NOT IMPLEMENTED. This constant is the policy intent;
 * actual detection requires LINKED_ACCOUNT_DETECTION_IMPLEMENTED = true and real logic
 * (IP/device clustering, FraudEvent.details, etc.). See fraud-risk.service.
 */
export const FLAG_LINKED_ACCOUNT_SUPPORT = true;

/**
 * Linked-account detection is NOT IMPLEMENTED. When false, shouldFlagAsLinkedAccountSupport
 * always returns false and the support-validation flow skips the check.
 * Real implementation would require: IP/device capture, storage in FraudEvent.details or
 * dedicated table, clustering job, and query in shouldFlagAsLinkedAccountSupport.
 */
export const LINKED_ACCOUNT_DETECTION_IMPLEMENTED = false;

// ---------------------------------------------------------------------------
// Rate limits (per user, server-side)
// ---------------------------------------------------------------------------

/** Max super votes per user per hour. */
export const RATE_LIMIT_SUPER_VOTES_PER_HOUR = 30;

/** Max gift sends per user per hour. */
export const RATE_LIMIT_GIFTS_PER_HOUR = 20;

/** Max daily bonus claims per user (1 per day; enforced in wallet.service). */
export const RATE_LIMIT_DAILY_CLAIMS_PER_DAY = 1;

/** Max support actions (gift + super vote) per user per hour (combined cap). */
export const RATE_LIMIT_SUPPORT_ACTIONS_PER_HOUR = 50;

/** Max account creation attempts per IP per hour (for auth layer). */
export const RATE_LIMIT_SIGNUP_ATTEMPTS_PER_IP_PER_HOUR = 5;

/** Max login attempts per account per hour (for auth layer). */
export const RATE_LIMIT_LOGIN_ATTEMPTS_PER_ACCOUNT_PER_HOUR = 10;

/** Max verification email resends per authenticated user per hour. */
export const RATE_LIMIT_VERIFICATION_RESEND_PER_USER_PER_HOUR = 4;

/** Max verification resend attempts per IP per hour (unauthenticated guard). */
export const RATE_LIMIT_VERIFICATION_RESEND_PER_IP_PER_HOUR = 10;

/** Max password-reset requests per email per hour (stored by normalized email in rate limit id). */
export const RATE_LIMIT_PASSWORD_RESET_PER_EMAIL_PER_HOUR = 3;

/** Max password-reset requests per IP per hour. */
export const RATE_LIMIT_PASSWORD_RESET_PER_IP_PER_HOUR = 10;

/** Max “new sign-in” alert emails per user per hour (abuse guard; real users rarely exceed this). */
export const RATE_LIMIT_NEW_LOGIN_ALERT_EMAIL_PER_USER_PER_HOUR = 20;

/** Max share events per user per hour (prevents share spam). */
export const RATE_LIMIT_SHARES_PER_USER_PER_HOUR = 60;

// ---------------------------------------------------------------------------
// Fraud event types (for FraudEvent.eventType)
// ---------------------------------------------------------------------------

/** Fraud event types for FraudEvent.eventType. Used for risk scoring and audit. */
export const FRAUD_EVENT_TYPES = {
  SELF_SUPPORT_ATTEMPT: 'SELF_SUPPORT_ATTEMPT',
  LINKED_ACCOUNT_SUPPORT: 'LINKED_ACCOUNT_SUPPORT',
  RAPID_SUPPORT_SPIKE: 'RAPID_SUPPORT_SPIKE',
  BONUS_FARMING_SUSPECT: 'BONUS_FARMING_SUSPECT',
  CONCENTRATED_SUPPORT: 'CONCENTRATED_SUPPORT',
  SAME_DEVICE_MULTI_ACCOUNT: 'SAME_DEVICE_MULTI_ACCOUNT',
  HIGH_RISK_SUPPORT_ACTION: 'HIGH_RISK_SUPPORT_ACTION',
  /** Bot-like: unnatural timing, repeated identical actions, scripted behavior. */
  BOT_LIKE_PATTERN: 'BOT_LIKE_PATTERN',
  /** Many accounts sharing device/IP acting as one fraud cluster. */
  DEVICE_CLUSTER_ABUSE: 'DEVICE_CLUSTER_ABUSE',
  /** Sudden fake engagement spike (e.g. automated likes/votes). */
  FAKE_ENGAGEMENT_SPIKE: 'FAKE_ENGAGEMENT_SPIKE',
  /** Too-fast repeated support actions in short window. */
  TOO_FAST_SUPPORT: 'TOO_FAST_SUPPORT',
} as const;

/** SupportReviewFlag.reason values (examples). */
export const SUPPORT_FLAG_REASONS = {
  SELF_SUPPORT: 'SELF_SUPPORT',
  LINKED_ACCOUNT: 'LINKED_ACCOUNT',
  RAPID_SPIKE: 'RAPID_SPIKE',
  HIGH_RISK_USER: 'HIGH_RISK_USER',
  CONCENTRATED_SUPPORT: 'CONCENTRATED_SUPPORT',
} as const;
