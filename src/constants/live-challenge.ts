/**
 * Live Challenge system constants
 * Real-time competitive performance: voting, gifts, scoring
 */

import { getRecordingMaxDurationSec } from './recording-modes';

/** Star vote range (1–5) */
export const LIVE_VOTE_STARS_MIN = 1;
export const LIVE_VOTE_STARS_MAX = 5;

/** Rate limit: votes per user per minute during live */
export const LIVE_VOTE_RATE_LIMIT_PER_MIN = 10;

/** Bayesian prior for weighted vote score */
export const LIVE_VOTE_PRIOR_MEAN = 3;
export const LIVE_VOTE_PRIOR_WEIGHT = 2;

/** Scoring weights: liveScore = W_vote * weightedVote + W_gift * giftScore + W_engagement * engagementBoost */
export const LIVE_SCORE_W_VOTE = 0.5;
export const LIVE_SCORE_W_GIFT = 0.4;
export const LIVE_SCORE_W_ENGAGEMENT = 0.1;


/** Default live challenge slot duration in seconds. */
export const LIVE_SLOT_DURATION_SEC = getRecordingMaxDurationSec('live');

/** Poll interval for live state (ms) */
export const LIVE_POLL_INTERVAL_MS = 2000;

/** Max coins per single live gift */
export const LIVE_GIFT_MAX_COINS = 1000;
