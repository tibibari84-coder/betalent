/**
 * BETALENT ranking and discovery algorithm – weights and thresholds.
 * Used by ranking.service for For You, Trending, and Challenge ranking.
 *
 * VIEWS ARE FALLBACK ONLY. Raw views must NEVER dominate ranking.
 * Primary signals: retention, replay, skip suppression, support quality, exploration.
 *
 * VANITY METRICS: Raw views and raw likes are WEAK. Central: retention, support, explicit intent, diversity.
 *
 * Signal hierarchy:
 * - Watch time (strongest when available; high completion rate → strong boost)
 * - Super votes (competitive support; 1 super vote = strong ranking boost)
 * - Gift support (premium fan support; larger/rarer gifts = stronger, e.g. Golden Score > Music Note)
 * - Engagement: Share > Comment > Like (likes weakest)
 * - Freshness: first 24h discovery boost, first 7 days moderate; after that rely on engagement
 * - Creator diversity (limit repeated creator exposure, rotate talent)
 * - New creator discovery (first 3 uploads get discovery testing)
 * - Anti-spam: self-vote and suspicious signals excluded from ranking score
 * - Momentum: rapid engagement growth in last 24h → temporary boost
 */

/** Weights for composite ranking score (normalized signals 0–1, then weighted sum). */
export const RANKING_WEIGHTS = {
  watchTime: 0.25,
  supportScore: 0.25,
  engagementScore: 0.2,
  freshnessScore: 0.15,
  momentumScore: 0.15,
} as const;

/** When AI vocal analysis exists: weight as one signal in general ranking (0 = off). AI score must NOT fully decide success; balanced with watch time, super votes, gifts, engagement, freshness. */
export const RANKING_WEIGHT_VOCAL_SCORE = 0.1;

/** In challenge contexts: weight for AI vocal score (stronger than general feed). Used for quality floor and ranking refinement; prevents low-quality viral spam from dominating. */
export const CHALLENGE_WEIGHT_VOCAL_SCORE = 0.2;

/** Within support: super vote weight vs gift weight. Super vote stronger than likes. */
export const SUPPORT_WEIGHTS = {
  superVote: 3,
  giftCoins: 2,
  /** Soft For You–specific gift monetization signal (total + velocity); kept subordinate to superVote/giftCoins. */
  forYouGiftSignal: 0.85,
} as const;

/** Half-life (hours) for decaying recentGiftVelocity when applying new gifts (matches gift.service). */
export const FOR_YOU_GIFT_VELOCITY_HALF_LIFE_HOURS = 4;

/** Max scale for normalizing For You gift signal in VideoRankingStats (computeRankingScore). */
export const FOR_YOU_GIFT_SIGNAL_NORM_MAX = 5;

/**
 * Gift tier weights: premium gifts (Golden Score, Platinum Record) = stronger ranking boost than basic (Music Note).
 * Slug → multiplier applied to coin value for support score. Fallback 1.0 for unknown slugs.
 */
export const GIFT_TIER_WEIGHTS: Record<string, number> = {
  'music-note': 1,
  microphone: 1.1,
  headphones: 1.15,
  'drum-beat': 1.2,
  piano: 1.25,
  'golden-score': 1.8,
  'platinum-record': 2,
};

/** Within engagement: Share > Comment > Like. */
export const ENGAGEMENT_WEIGHTS = {
  share: 3,
  comment: 2,
  like: 1,
} as const;

/** Freshness: first 24h = discovery boost, first 7 days = moderate boost. */
export const FRESHNESS_HOURS_24 = 24;
export const FRESHNESS_DAYS_7 = 7 * 24;
export const FRESHNESS_BOOST_24H = 1.4;
export const FRESHNESS_BOOST_7D = 1.15;

/** New creator discovery: first N uploads get discovery testing. */
export const NEW_CREATOR_UPLOAD_LIMIT = 3;
export const NEW_CREATOR_DISCOVERY_BOOST = 1.2;

/** Max videos per creator in For You (diversity). */
export const FEED_MAX_VIDEOS_PER_CREATOR = 2;

/**
 * For You: personalized vs exploration split (anti-filter-bubble).
 * 80% personalized (relevance, user interests); 20% exploration (discovery).
 */
export const FOR_YOU_PERSONALIZED_SHARE = 0.8;
export const FOR_YOU_EXPLORATION_SHARE = 0.2;

/** For You: multiplier for already-watched videos (down-rank, not exclude). 0.5 = half score. */
export const FOR_YOU_WATCHED_MULTIPLIER = 0.5;

/** For You: penalty for category user skipped fast (<20%). */
export const FOR_YOU_SKIP_CATEGORY_PENALTY = 0.3;

/** For You: boost for category user completed (≥70%). */
export const FOR_YOU_COMPLETION_CATEGORY_BOOST = 0.2;

/** For You: boost for videos with high completion rate (users watch to end). */
export const FOR_YOU_HIGH_COMPLETION_BOOST = 0.25;

/** For You: strong positive boost when users rewatch (replayCount > 0). */
export const FOR_YOU_REPLAY_BOOST = 0.2;

/** For You: strong negative penalty when users skip quickly (skipCount > 0). */
export const FOR_YOU_SKIP_PENALTY = 0.25;

/** For You: weight for watch time quality (totalWatchSeconds / viewCount, normalized). */
export const FOR_YOU_WATCH_TIME_QUALITY_WEIGHT = 0.15;

/** For You: min viewCount for real watch data to be trusted (avoid noise). */
export const FOR_YOU_MIN_WATCH_SAMPLE = 3;

/** Within personalized bucket (80%): ranking vs style-match. */
export const FOR_YOU_PERSONALIZED_MIX = {
  ranking: 0.65,
  styleMatch: 0.35,
} as const;

/** Within exploration bucket (20%): intentional discovery sources. */
export const FOR_YOU_EXPLORATION_MIX = {
  rising: 0.3,
  fresh: 0.3,
  challenge: 0.25,
  other: 0.15,
} as const;

/** Freshness window for "fresh uploads" bucket (hours). */
export const FOR_YOU_FRESH_HOURS = 48;

/** New upload boost: videos in first N hours get discovery boost. */
export const FOR_YOU_NEW_UPLOAD_BOOST_HOURS = 24;
export const FOR_YOU_NEW_UPLOAD_BOOST = 0.25;

/**
 * Half-life decay (Reddit/HN style). Tunable.
 * Every N hours, freshness influence halves: 0.5 ^ (ageHours / HALFLIFE_HOURS)
 */
export const FOR_YOU_HALFLIFE_HOURS = 24;

/**
 * Strong engagement can counterbalance decay.
 * retention + support + engagement (each 0–1) blended; high values reduce decay.
 */
export const FOR_YOU_DECAY_COUNTERBALANCE_WEIGHTS = {
  retention: 0.4,
  support: 0.35,
  engagement: 0.25,
} as const;

/** Retention score formula weights (dominant component). */
export const FOR_YOU_RETENTION_WEIGHTS = {
  completionRate: 0.70,
  watchTimeQuality: 0.15,
  replayBoostMax: 0.2,
  replayBoostPerCount: 0.03,
  skipPenaltyMax: 0.25,
  skipPenaltyPerCount: 0.03,
  minDurationSecForWatchQuality: 10,
} as const;

/**
 * Final score component weights. Priority: retention > support > engagement > personalization > freshness > challenge > creator > talent.
 * Centralized here for admin tunability and explainability — do not scatter magic numbers.
 */
export const FOR_YOU_FINAL_WEIGHTS = {
  retentionScore: 0.28,
  supportScore: 0.25,
  engagementScore: 0.15,
  personalizationScore: 0.12,
  freshnessScore: 0.08,
  /** Challenge participation only (0/1). NOT vote score. Keeps For You retention-first. */
  challengeScore: 0.06,
  creatorQualityScore: 0.04,
  talentScore: 0.02,
  /** Confidence-weighted star rating. Small weight; must not overpower retention. */
  voteScore: 0.04,
} as const;

/** Category affinity: boost when video matches user's preferred categories. */
export const FOR_YOU_CATEGORY_AFFINITY_BOOST = 0.2;

/**
 * For You feed: production weights for composite score.
 * Hierarchy: retention > support > engagement > talent/freshness > affinity > challenge > creator quality.
 * NOT vanity: raw views/likes are weak; retention, support, explicit intent, diversity are central.
 */
export const FOR_YOU_WEIGHTS = {
  retentionScore: 0.28,
  supportScore: 0.25,
  engagementScore: 0.15,
  talentScore: 0.10,
  freshnessScore: 0.10,
  userAffinityScore: 0.10,
  challengeRelevance: 0.08,
  creatorQualityScore: 0.05,
  diversityPenalty: -0.05,
  repeatPenalty: -0.10,
  moderationPenalty: -0.15,
} as const;

/** Max share of feed from same challenge (diversity). */
export const FOR_YOU_MAX_CHALLENGE_SHARE = 0.4;

/** Stage 2: Lightweight score cap. Top N candidates proceed to full scoring. */
export const LIGHTWEIGHT_SCORE_CAP = 400;

// ─── Fair discovery integrity (For You + shared surfaces) ─────────────────

/** Reference follower count for mega-creator dampening (log-scaled). */
export const FAIR_DISCOVERY_MEGA_FOLLOWER_REF = 50_000;

/** Maximum score reduction from mega-creator dampening (multiplicative). */
export const FAIR_DISCOVERY_MEGA_DAMPEN_MAX = 0.22;

/** Scales log10(1 + followers/ref) into dampening; tuned so ~500k followers nears cap. */
export const FAIR_DISCOVERY_MEGA_DAMPEN_PER_LOG = 0.35;

/** Floor for mega dampener output (never zero-out large accounts entirely). */
export const FAIR_DISCOVERY_MEGA_SCORE_FLOOR = 0.78;

/** Max multiplicative boost for underexposed videos (low views + low followers). */
export const FAIR_DISCOVERY_UNDEREXPOSED_MAX_MULT = 1.12;

/**
 * Cap on the gift-only portion of For You supportQuality:
 * (giftCoinsPerView*0.52 + forYouGiftBoost*0.15) after computePrimaryScore’s linear blend.
 * Vote rate term (0.33) is not capped here — talent votes stay separate from monetization.
 */
export const FOR_YOU_GIFT_SUPPORT_QUALITY_CAP = 0.36;

/** Lightweight stage: cap equivalent gift blend (coinPerView + forYou term). */
export const LIGHTWEIGHT_GIFT_BLEND_CAP = 0.42;

/** Session: min multiplier after N repeats (For You finalScore). */
export const SESSION_CREATOR_REPEAT_BASE_MULT = 0.32;

/** Session: per-prior-appearance penalty step (stronger anti-repeat). */
export const SESSION_CREATOR_REPEAT_STEP_MULT = 0.24;

/** Trending: gifts cannot contribute more than this share of (gift+non-gift) velocity mass. */
export const TRENDING_MAX_GIFT_VELOCITY_SHARE = 0.42;

/** New Voices: max items per creator in one response window. */
export const NEW_VOICES_MAX_PER_CREATOR_IN_WINDOW = 2;

/** New Voices: DB candidate pool before fair scoring. */
export const NEW_VOICES_CANDIDATE_POOL = 200;

/** Stage 2: Half-life for lightweight freshness (hours). */
export const LIGHTWEIGHT_HALFLIFE_HOURS = 24;

/** Stage 2: Lightweight score weights (engagement, support, growth, freshness). */
export const LIGHTWEIGHT_WEIGHTS = {
  engagement: 0.35,
  support: 0.30,
  growth: 0.15,
  freshness: 0.20,
} as const;

/**
 * Legacy exploration “random” bucket share — now filled with deterministic underexposed ordering
 * (see fair-discovery.service). No Math.random; same inputs → same order.
 */
export const FOR_YOU_EXPLORATION_RANDOM_SHARE = 0.3;

/**
 * PRODUCT DECISION: Challenge votes strongly affect challenge ranking,
 * but do NOT dominate the main For You feed.
 *
 * - Challenge ranking: starVoteScore weight 3 (strong signal)
 * - For You feed: challengeRelevance = participation only (0/1), weight 0.06; NO vote score
 *
 * Challenge ranking: combined formula. Votes matter strongly; retention, support, talent also matter.
 * No single weak metric dominates. All normalized 0–1 over challenge set.
 */
export const CHALLENGE_RANKING_WEIGHTS = {
  /** Bayesian-weighted star votes (1–5). Strong signal. */
  starVoteScore: 3,
  /** Super votes (coin support). */
  superVotes: 2.5,
  /** Gift support. */
  giftSupport: 2.5,
  /** Retention: completion rate from watch stats. */
  retentionScore: 2,
  /** Replay quality: rewatches = strong engagement. */
  replayQuality: 1,
  /** Talent score (0–10 from 1–10 votes). */
  talentScore: 1,
  /** Engagement ratio (likes+comments)/views. */
  engagementRatio: 1,
  /** Raw likes (weak). */
  likes: 0.3,
} as const;

/**
 * Advanced competition dynamics for challenge ranking.
 * Time decay, momentum, finalist locking, diversity guard.
 */
export const CHALLENGE_DYNAMICS = {
  /** Time decay: half-life in hours. Older entries decay: multiplier = exp(-ageHours / halfLifeHours). */
  timeDecayHalfLifeHours: 72,
  /** Max time decay multiplier (min 0.7 = 30% decay at most). */
  timeDecayMinMultiplier: 0.7,
  /** Momentum: hours window for recent acceleration. */
  momentumWindowHours: 24,
  /** Momentum: max boost multiplier (0.15 = up to 15% boost). */
  momentumMaxBoost: 0.15,
  /** When true, finalists get no decay/momentum (stable ranking). */
  finalistLockDisablesDecayAndMomentum: true,
  /** Max entries per creator in top N. */
  creatorDiversityMaxPerCreatorInTop: 2,
  /** Top N for creator diversity cap. */
  creatorDiversityTopN: 10,
  /** Max entries per style in top N (cover challenges). */
  styleBalanceMaxPerStyleInTop: 2,
  /** Top N for style balance cap. */
  styleBalanceTopN: 10,
} as const;

/**
 * Trending: velocity-based score in a time window.
 * Pillars: rapid super vote activity, rapid gift support, rapid engagement growth, high watch completion.
 * Score = per-hour rates (so shorter windows = same velocity, trending updates frequently).
 */
export const TREND_WEIGHTS_VELOCITY = {
  /** Rapid super vote activity (strongest signal). */
  superVotesPerHour: 5,
  /** Rapid gift support (subordinate to votes/engagement; additional cap in fair-discovery assembly). */
  giftCoinsPerHour: 3,
  /** Rapid engagement: comments. */
  commentsPerHour: 2,
  /** Rapid engagement: likes. */
  likesPerHour: 1,
  /** High watch completion (proxy from engagement ratio when no view events). */
  watchCompletionProxy: 3,
} as const;

/** Min engagement in trend window to be eligible (anti-noise). */
export const TREND_MIN_ENGAGEMENT_IN_WINDOW = 1;

/** Max video candidates to fetch for trending. Engagement-first, then fetch only top N for full scoring. */
export const TRENDING_CANDIDATE_CAP = 300;

/** Dampen lifetime mega-views so stale blockbusters do not monopolize trending. multiplier *= 1/(1 + strength * ln(1+views)). */
export const TREND_LIFETIME_VIEW_DAMPEN_STRENGTH = 0.065;

/** Anti-spam: ignore support from same user as creator (self-vote). Handled in application. */
export const ANTI_SPAM_SELF_VOTE_EXCLUDE = true;

/** Momentum: time window (hours) for "rapid increase" in engagement. */
export const MOMENTUM_WINDOW_HOURS = 24;

/**
 * Early distribution: new uploads get initial exposure batch, then boost or suppress based on retention.
 * Enables breakout viral content from unknown creators.
 */
export const EARLY_DISTRIBUTION = {
  /** Min watch samples before evaluating (completion/skip/replay). */
  minSamples: 50,
  /** Max samples in "testing" phase before forced graduation. */
  maxSamples: 200,
  /** Age (hours) for early test phase. Newer = in testing. */
  testPhaseHours: 48,
  /** Boost: completionRate >= this and skipRate <= boostSkipMax → boost to larger audience. */
  boostCompletionMin: 0.5,
  boostSkipMax: 0.3,
  /** Suppress: completionRate < this OR skipRate >= this → suppress quickly. */
  suppressCompletionMax: 0.3,
  suppressSkipMin: 0.5,
  /** Multipliers applied to score. */
  boostMultiplier: 1.5,
  suppressMultiplier: 0.2,
  /** Slight priority for very new videos (< minSamples) to ensure they get initial exposure. */
  seedingBoost: 1.15,
} as const;
