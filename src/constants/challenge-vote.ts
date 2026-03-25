/**
 * BETALENT challenge star-vote system – constants.
 * Design: elegant, premium, fair, explainable. No cheap poll-style behavior.
 *
 * Scoped to challenges only; not used in main For You feed.
 *
 * Weighted vote formula (Bayesian):
 *   weightedVoteScore = (priorMean * priorWeight + sum(stars)) / (priorWeight + votesCount)
 * Small samples are pulled toward priorMean; large samples dominate.
 * Fair: 2 votes at 5.0 cannot beat 100 votes at 4.8.
 */

/** Valid star range (1–5). */
export const CHALLENGE_VOTE_STARS_MIN = 1;
export const CHALLENGE_VOTE_STARS_MAX = 5;

/** Rate limit: max vote actions per user per hour (submit + update count). */
export const CHALLENGE_VOTE_RATE_LIMIT_PER_HOUR = 60;

/** Bayesian prior mean: neutral platform average (1–5 scale). */
export const CHALLENGE_VOTE_PRIOR_MEAN = 3.5;

/** Bayesian prior weight: equivalent votes to trust the prior. Higher = more conservative. */
export const CHALLENGE_VOTE_PRIOR_WEIGHT = 10;

/** Min votes for "trusted" sample (display/UI). Below this, score is confidence-adjusted. */
export const CHALLENGE_VOTE_MIN_CONFIDENCE_THRESHOLD = 5;

// Legacy aliases for backward compat
export const CHALLENGE_VOTE_BAYESIAN_PRIOR_AVG = CHALLENGE_VOTE_PRIOR_MEAN;
export const CHALLENGE_VOTE_BAYESIAN_PRIOR_WEIGHT = CHALLENGE_VOTE_PRIOR_WEIGHT;
