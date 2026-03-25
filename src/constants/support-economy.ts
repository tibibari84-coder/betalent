/**
 * BETALENT support economy – clear separation of three systems.
 * Do not mix these in logic or UI.
 *
 * 1. LIKES – free engagement
 *    - No coins, no wallet, no support statistics.
 *    - API: POST/DELETE /api/like. Updates Like + Video.likesCount only.
 *
 * 2. SUPER VOTES – competitive support (challenge ranking)
 *    - Cost coins (wallet debit sender, credit creator).
 *    - Create wallet transactions: SUPER_VOTE_SPENT, RECEIVED_VOTES.
 *    - Update video support: VideoSupportStats (totalSuperVotes, totalCoinsEarned), Video.score.
 *    - Video.score is used in challenge leaderboard ranking.
 *    - Service: coin.service spendCoinsForSuperVote. API: POST /api/videos/[id]/super-vote.
 *
 * 3. GIFTS – premium fan support
 *    - Cost coins (wallet debit sender).
 *    - Create wallet transaction: GIFT_SENT; GiftTransaction; creator earnings ledgers.
 *    - Update video support: Video.coinsCount, Video.giftsCount, VideoGiftTypeSummary, VideoSupporterSummary.
 *    - Update creator support: User.totalCoinsReceived, CreatorSupporterSummary, CreatorSupportWeekly, CreatorEarningsSummary.
 *    - Do not update Video.score (no challenge ranking impact).
 *    - Service: gift.service sendGift. API: POST /api/gifts/send.
 */

export const SUPPORT_ECONOMY = {
  LIKES: 'free_engagement',
  SUPER_VOTES: 'competitive_support',
  GIFTS: 'premium_fan_support',
} as const;
