/**
 * Payout preparation – configurable thresholds and policy.
 * No real provider integration; used for eligibility and UI state.
 *
 * Safety: All payout eligibility is server-calculated. Do not trust client.
 *
 * Three totals (backend-safe, single source of truth):
 * - Lifetime support total: all-time gifts (creator share) + super votes + challenge rewards.
 * - Pending support total: support received within PAYOUT_HOLD_DAYS (gifts + super votes;
 *   challenge rewards included only if CHALLENGE_REWARDS_SUBJECT_TO_HOLD).
 * - Estimated withdrawable: lifetime minus pending. Never present all support as instantly withdrawable.
 */

/** Minimum coin balance required to be eligible for payout (when payout is enabled). Configurable. */
export const PAYOUT_MINIMUM_COINS = 5000;

/** Hold window (days): support received in this window is "pending" and not yet withdrawable. */
export const PAYOUT_HOLD_DAYS = 7;

/**
 * If true, challenge rewards in the hold window count as pending (same as gifts/super votes).
 * If false, challenge rewards are immediately eligible and do not go into pending.
 * Configurable per policy.
 */
export const CHALLENGE_REWARDS_SUBJECT_TO_HOLD = true;
