/**
 * BETALENT Anti-Cheat and Fair Play Architecture – design contract for trust & safety.
 *
 * This module documents the anti-fraud system design. It does NOT implement all logic;
 * implementation lives in:
 * - services/fraud-risk.service.ts (risk scoring, events, payout block)
 * - services/support-validation.service.ts (pre-support validation, rate limits)
 * - constants/anti-cheat.ts (thresholds, rate limits, event types)
 * - Prisma: FraudEvent, AccountRiskProfile, SupportReviewFlag
 *
 * Goals: prevent manipulation of coins, votes, gifts, rankings, and challenge outcomes.
 * Protect creator fairness and platform trust. Do not auto-ban on one weak signal; use
 * risk scoring and review.
 */

// ---------------------------------------------------------------------------
// 1. CHEAT TYPES TO DETECT
// ---------------------------------------------------------------------------

/**
 * Main cheat types the system detects and prevents:
 *
 * A. Multi-account self-boosting – one person uses multiple accounts to super vote
 *    or gift themselves. Mitigation: account linking signals, self-support block.
 *
 * B. Coin farming abuse – accounts farming login/upload bonuses unnaturally.
 *    Mitigation: rate limits on daily claims, fraud events (BONUS_FARMING_SUSPECT).
 *
 * C. Suspicious support loops – repeated gifting or voting between connected accounts.
 *    Mitigation: link detection, flag for review, exclude confirmed fraud from ranking.
 *
 * D. Device/IP clustering abuse – many linked accounts acting as one fraud cluster.
 *    Mitigation: account linking signals (IP, device, session), risk score, review.
 *
 * E. Bot-like interaction patterns – unnatural timing, repeated identical actions,
 *    scripted behavior. Mitigation: rate limits, timing heuristics, fraud events.
 */

export const CHEAT_CATEGORIES = {
  MULTI_ACCOUNT_SELF_BOOST: 'multi_account_self_boost',
  COIN_FARMING: 'coin_farming',
  SUPPORT_LOOPS: 'support_loops',
  DEVICE_IP_CLUSTER: 'device_ip_cluster',
  BOT_LIKE_PATTERNS: 'bot_like_patterns',
} as const;

// ---------------------------------------------------------------------------
// 2. ACCOUNT LINKING SIGNALS (for FraudEvent.details and risk scoring)
// ---------------------------------------------------------------------------

/**
 * Keys to store in FraudEvent.details (or use when evaluating risk).
 * Do not auto-ban from one weak signal; combine into risk scoring.
 */
export const ACCOUNT_LINKING_SIGNAL_KEYS = {
  /** Hashed IP (e.g. SHA256(ip)) for clustering; do not store raw IP. */
  IP_HASH: 'ipHash',
  /** Device fingerprint from client or backend (e.g. fingerprintjs). */
  DEVICE_ID: 'deviceId',
  /** Browser/session fingerprint or session ID. */
  SESSION_FINGERPRINT: 'sessionFingerprint',
  /** Suspicious session timing (e.g. same second as another account). */
  SUSPICIOUS_SESSION_TIMING: 'suspiciousSessionTiming',
  /** Repeated login pattern (e.g. same device, many accounts). */
  REPEATED_LOGIN_PATTERN: 'repeatedLoginPattern',
  /** Related account IDs in the same cluster (from graph analysis). */
  LINKED_ACCOUNT_IDS: 'linkedAccountIds',
  /** Target user/creator of the support action (for self-support / loop detection). */
  TARGET_USER_ID: 'targetUserId',
  /** Action type: SUPER_VOTE, GIFT, etc. */
  ACTION_TYPE: 'actionType',
} as const;

// ---------------------------------------------------------------------------
// 3. FRAUD RISK SCORE AND LEVELS
// ---------------------------------------------------------------------------

/**
 * FraudRiskScore is 0–100 aggregate per user (AccountRiskProfile.fraudRiskScore).
 * Built from: weighted FraudEvents (by riskLevel), suspiciousSupportCount.
 *
 * Risk levels (FraudRiskLevel): LOW, MEDIUM, HIGH, CRITICAL.
 * - LOW: no or minimal signals; no action.
 * - MEDIUM: some signals; monitor, may flag next support.
 * - HIGH: flag support for review, block payout; do not block support yet (configurable).
 * - CRITICAL: block support actions, block payout, consider suspend/ban via moderation.
 *
 * Thresholds and block/flag behavior: constants/anti-cheat.ts (RISK_SCORE_THRESHOLDS,
 * BLOCK_SUPPORT_AT_RISK_LEVEL, FLAG_FOR_REVIEW_AT_RISK_LEVEL, PAYOUT_BLOCK_AT_RISK_LEVEL).
 */

// ---------------------------------------------------------------------------
// 4. SELF-SUPPORT POLICY (server-enforced)
// ---------------------------------------------------------------------------

/**
 * - Direct gifting to own performance: disallowed (SELF_GIFT_DISALLOWED).
 * - Direct super vote to own challenge entry / video: disallowed (SELF_SUPER_VOTE_DISALLOWED).
 * - Linked-account suspicious support: flagged for review; when confirmed fraud, excluded
 *   from ranking and payout (SupportReviewFlag status CONFIRMED_FRAUD).
 * All enforced in support-validation.service and API routes before processing.
 */

// ---------------------------------------------------------------------------
// 5. SUPPORT VALIDATION (before super vote, gift, challenge support)
// ---------------------------------------------------------------------------

/**
 * Before processing any support action, run (support-validation.service.validateSupportAction):
 *
 * 1. Sufficient balance (caller/coin.service checks).
 * 2. Actor not banned/suspended (future: User.bannedAt / status).
 * 3. Not self-supporting (actor !== target creator); if so, reject and record fraud event.
 * 4. Not currently rate-limited (per-user limits for super votes, gifts, combined support/hour).
 * 5. Not high-risk fraud pattern: if risk level >= BLOCK_SUPPORT_AT_RISK_LEVEL, reject.
 * 6. If risk level >= FLAG_FOR_REVIEW_AT_RISK_LEVEL, allow but flag transaction for review.
 *
 * After a supported action, optional: create SupportReviewFlag (PENDING) when flagForReview.
 */

export type SupportValidationCheck =
  | 'BALANCE'
  | 'NOT_BANNED'
  | 'NOT_SELF_SUPPORT'
  | 'NOT_RATE_LIMITED'
  | 'NOT_FRAUD_BLOCKED'
  | 'FLAG_IF_HIGH_RISK';

// ---------------------------------------------------------------------------
// 6. RATE LIMITS
// ---------------------------------------------------------------------------

/**
 * Rate limits (constants/anti-cheat.ts) – help prevent automated abuse:
 *
 * - Super votes per user per hour
 * - Gifts per user per hour
 * - Combined support actions (gift + super vote) per user per hour
 * - Daily claims per user per day (e.g. login/upload bonus)
 * - Account creation attempts per IP per hour (enforce in auth/signup layer)
 * - Login attempts per account per hour (enforce in auth layer)
 *
 * Enforcement: support limits in support-validation.service; daily claim in wallet/coin
 * service; signup/login limits in auth routes (to be wired).
 */

// ---------------------------------------------------------------------------
// 7. MODERATION ACTIONS (shadow penalties / review)
// ---------------------------------------------------------------------------

/**
 * Moderation actions (ModerationActionType in Prisma) used for anti-cheat outcomes:
 *
 * - Flag transaction / send to review: SupportReviewFlag (PENDING), SEND_TO_FRAUD_REVIEW
 * - Exclude suspicious support from ranking: CONFIRMED_FRAUD on flag → getConfirmedFraudSupportSourceIds();
 *   ranking and momentum exclude those sourceIds
 * - Freeze payout eligibility: FREEZE_PAYOUT, AccountRiskProfile.payoutBlocked
 * - Warn user: WARN
 * - Suspend account: SUSPEND
 * - Ban account: BAN
 * - Block linked fraud cluster: (future) bulk action on cluster
 *
 * Do not instantly punish on weak evidence. Use review and confidence thresholds;
 * trust team confirms SupportReviewFlag to CONFIRMED_FRAUD or DISMISSED.
 */

// ---------------------------------------------------------------------------
// 8. CHALLENGE FAIRNESS
// ---------------------------------------------------------------------------

/**
 * Challenge rankings must not let suspicious support unfairly boost positions.
 *
 * - Support (super votes, gifts) that is confirmed fraud (SupportReviewFlag status
 *   CONFIRMED_FRAUD) is excluded from ranking: getConfirmedFraudSupportSourceIds() is
 *   used when computing video support (getSupportExcludingSelf) and momentum.
 * - Suspicious support is sent to trust review; when confirmed, marked so and excluded.
 * - Challenge stats and leaderboards should use the same exclusion (ranking.service
 *   and any challenge-specific aggregation use support counts that exclude confirmed
 *   fraud sourceIds).
 */

// ---------------------------------------------------------------------------
// 9. PAYOUT PROTECTION HOOKS
// ---------------------------------------------------------------------------

/**
 * - isPayoutBlocked(userId): when AccountRiskProfile.payoutBlocked is true (e.g. risk
 *   level HIGH/CRITICAL), payout preparation treats creator as blocked (under_review /
 *   blocked readiness state).
 * - Future: when computing withdrawable/eligible coins, exclude support that came from
 *   transactions in getConfirmedFraudSupportSourceIds() so that confirmed-fraud gifts
 *   do not count toward payout. Currently payout block is per-creator risk; per-tx
 *   exclusion can be added in creator-earnings or payout-preparation when aggregating
 *   ledger by sourceId.
 */
