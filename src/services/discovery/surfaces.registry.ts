/**
 * Discovery surface registry — one map from product surfaces to implementation.
 * Ranking logic lives in the referenced modules; this file prevents accidental parallel “brains”.
 *
 * | Surface            | Implementation |
 * |--------------------|----------------|
 * | For You            | getForYouFeedV2 → services/for-you/feed-v2.service |
 * | Trending           | getTrendingVideos → services/trending.service → ranking.service#getTrendingRanked |
 * | New Voices         | getNewVoicesFairVideoIds → services/new-voices-fair.service |
 * | Following          | prisma + interleaveFollowingFeedVideos → services/fair-discovery.service |
 * | Suggested creators | getCreatorRecommendationsForViewer → services/creator-recommendations.service |
 *
 * Shared post-filters: filterVideoIdsForFeedViewer (profile visibility), CANONICAL_PUBLIC_VIDEO_WHERE for playback-ready public cards.
 */

export const DISCOVERY_SURFACE_MODULES = {
  forYou: '@/services/for-you/feed-v2.service',
  trending: '@/services/trending.service',
  newVoices: '@/services/new-voices-fair.service',
  creatorRecommendations: '@/services/creator-recommendations.service',
} as const;
