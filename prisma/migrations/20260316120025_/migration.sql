-- CreateEnum
CREATE TYPE "CreatorTier" AS ENUM ('STARTER', 'RISING', 'FEATURED', 'SPOTLIGHT', 'GLOBAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'HIDDEN', 'REPORTED');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('PURCHASE', 'GIFT_SENT', 'GIFT_RECEIVED', 'PLATFORM_FEE', 'REFUND', 'BONUS', 'DAILY_BONUS', 'VIDEO_UPLOAD_REWARD', 'RECEIVED_VOTES', 'SUPER_VOTE_SPENT', 'CHALLENGE_REWARD', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "GiftType" AS ENUM ('BRONZE_MIC', 'SILVER_GUITAR', 'GOLDEN_PIANO', 'DIAMOND_VOICE');

-- CreateEnum
CREATE TYPE "GiftTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('GIFT_TRANSACTION', 'COIN_PURCHASE', 'BONUS', 'REFUND');

-- CreateEnum
CREATE TYPE "GiftRarityTier" AS ENUM ('BASIC', 'PREMIUM', 'RARE', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'OPEN', 'VOTING', 'ENDED');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "BattleVoteType" AS ENUM ('GIFT', 'COIN_VOTE', 'SUPER_VOTE');

-- CreateEnum
CREATE TYPE "CreatorVerificationLevel" AS ENUM ('STANDARD_CREATOR', 'IDENTITY_VERIFIED', 'TRUSTED_PERFORMER', 'OFFICIAL_ARTIST');

-- CreateEnum
CREATE TYPE "CreatorVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ChallengeEntryFairnessStatus" AS ENUM ('CLEAN', 'SUPPORT_EXCLUDED', 'FROZEN', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "CoinPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CoinPurchaseProvider" AS ENUM ('MOCK', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "GiftAbuseFlagKind" AS ENUM ('SELF_GIFT_ATTEMPT', 'RATE_LIMIT_EXCEEDED', 'RAPID_GIFTING', 'HIGH_FREQUENCY_PAIR', 'NEW_ACCOUNT_GIFT', 'DUPLICATE_ATTEMPT', 'SUSPICIOUS_PATTERN');

-- CreateEnum
CREATE TYPE "AudioAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FLAGGED', 'FAILED', 'RETRYABLE_FAILED');

-- CreateEnum
CREATE TYPE "AiVoiceRiskLevel" AS ENUM ('LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "OriginalityStatus" AS ENUM ('CLEAN', 'SUSPECTED_DUPLICATE', 'SUSPECTED_STOLEN', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'LIMITED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PayoutProfileStatus" AS ENUM ('NOT_SET_UP', 'PENDING_VERIFICATION', 'READY', 'BLOCKED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "PayoutVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "PayoutRecordStatus" AS ENUM ('REQUESTED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FraudRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupportReviewFlagType" AS ENUM ('GIFT', 'SUPER_VOTE');

-- CreateEnum
CREATE TYPE "SupportReviewFlagStatus" AS ENUM ('PENDING', 'CONFIRMED_FRAUD', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AccountModerationStatus" AS ENUM ('CLEAN', 'WATCHLIST', 'LIMITED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('VIDEO', 'USER', 'SUPPORT_FLAG', 'CHALLENGE_ENTRY', 'CREATOR_VERIFICATION');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('APPROVE', 'FLAG', 'LIMIT_DISCOVERY', 'REMOVE_FROM_CHALLENGE', 'BLOCK_VIDEO', 'DELETE_VIDEO', 'WARN', 'WATCHLIST', 'RESTRICT_SUPPORT', 'SUSPEND', 'BAN', 'VALIDATE_SUPPORT', 'EXCLUDE_FROM_RANKING', 'VOID_SUPPORT', 'REFUND', 'SEND_TO_FRAUD_REVIEW', 'FREEZE_PAYOUT', 'CLEAR_RISK_STATE', 'EXCLUDE_ENTRY_SUPPORT', 'FREEZE_ENTRY', 'DISQUALIFY_ENTRY', 'RESTORE_ENTRY', 'APPROVE_VERIFICATION', 'REJECT_VERIFICATION', 'REVOKE_VERIFICATION', 'REQUEST_MORE_INFO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "city" TEXT,
    "talentType" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "creatorTier" "CreatorTier" NOT NULL DEFAULT 'STARTER',
    "uploadLimitSec" INTEGER NOT NULL DEFAULT 60,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "rankProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rankUpdatedAt" TIMESTAMP(3),
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "videosCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsReceived" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsSpent" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "fairPlayPolicyAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moderationStatus" "AccountModerationStatus",

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationLevel" "CreatorVerificationLevel" NOT NULL DEFAULT 'STANDARD_CREATOR',
    "verificationStatus" "CreatorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "requestPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB,
    "prizeDescription" TEXT,
    "prizeCoins" JSONB,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeEntry" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "fairnessStatus" "ChallengeEntryFairnessStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeWinner" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveBattle" (
    "id" TEXT NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 180,
    "winnerId" TEXT,
    "bonusCoinsForWinner" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveBattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveBattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveBattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleVote" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "recipientCreatorId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "voteType" "BattleVoteType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleWinner" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "winnerScore" INTEGER NOT NULL,
    "loserId" TEXT NOT NULL,
    "loserScore" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleWinner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "durationSec" INTEGER NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "coinsCount" INTEGER NOT NULL DEFAULT 0,
    "giftsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bonusCoins" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isPromotional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinPurchaseOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinPackageId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "CoinPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "CoinPurchaseProvider" NOT NULL DEFAULT 'MOCK',
    "providerReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CoinPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "animationType" TEXT,
    "coinCost" INTEGER NOT NULL,
    "rarityTier" "GiftRarityTier" NOT NULL DEFAULT 'BASIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsSpent" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lastDailyBonusClaimAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftTransaction" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "creatorShareCoins" INTEGER NOT NULL,
    "platformShareCoins" INTEGER NOT NULL,
    "status" "GiftTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftIdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftAbuseFlag" (
    "id" TEXT NOT NULL,
    "giftTransactionId" TEXT,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "videoId" TEXT,
    "kind" "GiftAbuseFlagKind" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftAbuseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoGiftTypeSummary" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoGiftTypeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSupporterSummary" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalCoinsSent" INTEGER NOT NULL DEFAULT 0,
    "giftsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoSupporterSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSupporterSummary" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalCoinsSent" INTEGER NOT NULL DEFAULT 0,
    "giftsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreatorSupporterSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEarningsLedger" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "grossCoins" INTEGER NOT NULL,
    "creatorShareCoins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorEarningsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorEarningsSummary" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "availableEarningsCoins" INTEGER NOT NULL DEFAULT 0,
    "totalEarningsCoins" INTEGER NOT NULL DEFAULT 0,
    "totalGiftsReceivedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingPayoutCoins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorEarningsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSupportWeekly" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "totalCoinsReceived" INTEGER NOT NULL DEFAULT 0,
    "giftsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreatorSupportWeekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRevenueLedger" (
    "id" TEXT NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "grossCoins" INTEGER NOT NULL,
    "platformShareCoins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRevenueLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "videoId" TEXT,
    "type" "CoinTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSupportStats" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "totalSuperVotes" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsEarned" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSupportStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRankingStats" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watchTimeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supportScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "momentumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRankingStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoWatchStats" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "totalWatchSeconds" INTEGER NOT NULL DEFAULT 0,
    "completedViewsCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoWatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAudioAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "pitchAccuracyScore" DOUBLE PRECISION,
    "rhythmTimingScore" DOUBLE PRECISION,
    "toneStabilityScore" DOUBLE PRECISION,
    "clarityScore" DOUBLE PRECISION,
    "dynamicControlScore" DOUBLE PRECISION,
    "performanceConfidenceScore" DOUBLE PRECISION,
    "overallVocalScore" DOUBLE PRECISION,
    "analysisStatus" "AudioAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "flagReason" TEXT,
    "styleCategoryId" TEXT,
    "rawPayload" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "analysisVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAudioAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaIntegrityAnalysis" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "audioFingerprint" TEXT,
    "videoFingerprint" TEXT,
    "aiVoiceRiskScore" DOUBLE PRECISION,
    "aiVoiceRiskLevel" "AiVoiceRiskLevel",
    "duplicateRiskScore" DOUBLE PRECISION,
    "originalityStatus" "OriginalityStatus" NOT NULL DEFAULT 'CLEAN',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "flagReason" TEXT,
    "lipSyncRiskScore" DOUBLE PRECISION,
    "rawPayload" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaIntegrityAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayoutProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PayoutProfileStatus" NOT NULL DEFAULT 'NOT_SET_UP',
    "verificationStatus" "PayoutVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "payoutMethodType" "PayoutMethodType" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "payoutMethodConfigured" BOOLEAN NOT NULL DEFAULT false,
    "minimumThresholdMet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayoutRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "amountFiatEstimated" INTEGER,
    "status" "PayoutRecordStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "payoutMethodType" "PayoutMethodType" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorPayoutRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "riskLevel" "FraudRiskLevel" NOT NULL DEFAULT 'LOW',
    "details" JSONB,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRiskProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fraudRiskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "FraudRiskLevel" NOT NULL DEFAULT 'LOW',
    "linkedAccountCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousSupportCount" INTEGER NOT NULL DEFAULT 0,
    "payoutBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastFraudEventAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportReviewFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "videoId" TEXT,
    "type" "SupportReviewFlagType" NOT NULL,
    "status" "SupportReviewFlagStatus" NOT NULL DEFAULT 'PENDING',
    "sourceId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportReviewFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationActionLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "actionType" "ModerationActionType" NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationNote" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_creatorTier_idx" ON "User"("creatorTier");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_moderationStatus_idx" ON "User"("moderationStatus");

-- CreateIndex
CREATE INDEX "User_totalCoinsReceived_idx" ON "User"("totalCoinsReceived");

-- CreateIndex
CREATE INDEX "User_totalCoinsSpent_idx" ON "User"("totalCoinsSpent");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorVerification_userId_key" ON "CreatorVerification"("userId");

-- CreateIndex
CREATE INDEX "CreatorVerification_userId_idx" ON "CreatorVerification"("userId");

-- CreateIndex
CREATE INDEX "CreatorVerification_verificationStatus_idx" ON "CreatorVerification"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "Challenge_categoryId_idx" ON "Challenge"("categoryId");

-- CreateIndex
CREATE INDEX "Challenge_startAt_idx" ON "Challenge"("startAt");

-- CreateIndex
CREATE INDEX "Challenge_endAt_idx" ON "Challenge"("endAt");

-- CreateIndex
CREATE INDEX "ChallengeEntry_challengeId_idx" ON "ChallengeEntry"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeEntry_creatorId_idx" ON "ChallengeEntry"("creatorId");

-- CreateIndex
CREATE INDEX "ChallengeEntry_fairnessStatus_idx" ON "ChallengeEntry"("fairnessStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_challengeId_creatorId_key" ON "ChallengeEntry"("challengeId", "creatorId");

-- CreateIndex
CREATE INDEX "ChallengeWinner_challengeId_idx" ON "ChallengeWinner"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeWinner_creatorId_idx" ON "ChallengeWinner"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeWinner_challengeId_creatorId_key" ON "ChallengeWinner"("challengeId", "creatorId");

-- CreateIndex
CREATE INDEX "LiveBattle_status_idx" ON "LiveBattle"("status");

-- CreateIndex
CREATE INDEX "LiveBattle_startAt_idx" ON "LiveBattle"("startAt");

-- CreateIndex
CREATE INDEX "LiveBattleParticipant_battleId_idx" ON "LiveBattleParticipant"("battleId");

-- CreateIndex
CREATE INDEX "LiveBattleParticipant_creatorId_idx" ON "LiveBattleParticipant"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveBattleParticipant_battleId_slot_key" ON "LiveBattleParticipant"("battleId", "slot");

-- CreateIndex
CREATE INDEX "BattleVote_battleId_idx" ON "BattleVote"("battleId");

-- CreateIndex
CREATE INDEX "BattleVote_recipientCreatorId_idx" ON "BattleVote"("recipientCreatorId");

-- CreateIndex
CREATE INDEX "BattleVote_senderId_idx" ON "BattleVote"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleWinner_battleId_key" ON "BattleWinner"("battleId");

-- CreateIndex
CREATE INDEX "BattleWinner_winnerId_idx" ON "BattleWinner"("winnerId");

-- CreateIndex
CREATE INDEX "BattleWinner_loserId_idx" ON "BattleWinner"("loserId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_publicId_key" ON "Video"("publicId");

-- CreateIndex
CREATE INDEX "Video_creatorId_idx" ON "Video"("creatorId");

-- CreateIndex
CREATE INDEX "Video_categoryId_idx" ON "Video"("categoryId");

-- CreateIndex
CREATE INDEX "Video_status_idx" ON "Video"("status");

-- CreateIndex
CREATE INDEX "Video_score_idx" ON "Video"("score");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- CreateIndex
CREATE INDEX "Video_status_coinsCount_idx" ON "Video"("status", "coinsCount");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_videoId_idx" ON "Comment"("videoId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Like_videoId_idx" ON "Like"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_videoId_key" ON "Like"("userId", "videoId");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPackage_internalName_key" ON "CoinPackage"("internalName");

-- CreateIndex
CREATE INDEX "CoinPackage_isActive_idx" ON "CoinPackage"("isActive");

-- CreateIndex
CREATE INDEX "CoinPackage_sortOrder_idx" ON "CoinPackage"("sortOrder");

-- CreateIndex
CREATE INDEX "CoinPurchaseOrder_userId_idx" ON "CoinPurchaseOrder"("userId");

-- CreateIndex
CREATE INDEX "CoinPurchaseOrder_status_idx" ON "CoinPurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "CoinPurchaseOrder_provider_providerReferenceId_idx" ON "CoinPurchaseOrder"("provider", "providerReferenceId");

-- CreateIndex
CREATE INDEX "CoinPurchaseOrder_createdAt_idx" ON "CoinPurchaseOrder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Gift_slug_key" ON "Gift"("slug");

-- CreateIndex
CREATE INDEX "Gift_slug_idx" ON "Gift"("slug");

-- CreateIndex
CREATE INDEX "Gift_rarityTier_idx" ON "Gift"("rarityTier");

-- CreateIndex
CREATE INDEX "Gift_isActive_idx" ON "Gift"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "GiftTransaction_senderId_idx" ON "GiftTransaction"("senderId");

-- CreateIndex
CREATE INDEX "GiftTransaction_receiverId_idx" ON "GiftTransaction"("receiverId");

-- CreateIndex
CREATE INDEX "GiftTransaction_videoId_idx" ON "GiftTransaction"("videoId");

-- CreateIndex
CREATE INDEX "GiftTransaction_giftId_idx" ON "GiftTransaction"("giftId");

-- CreateIndex
CREATE INDEX "GiftTransaction_status_idx" ON "GiftTransaction"("status");

-- CreateIndex
CREATE INDEX "GiftTransaction_createdAt_idx" ON "GiftTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftIdempotencyKey_key_key" ON "GiftIdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "GiftIdempotencyKey_key_idx" ON "GiftIdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "GiftIdempotencyKey_userId_idx" ON "GiftIdempotencyKey"("userId");

-- CreateIndex
CREATE INDEX "GiftIdempotencyKey_createdAt_idx" ON "GiftIdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "GiftAbuseFlag_senderId_idx" ON "GiftAbuseFlag"("senderId");

-- CreateIndex
CREATE INDEX "GiftAbuseFlag_receiverId_idx" ON "GiftAbuseFlag"("receiverId");

-- CreateIndex
CREATE INDEX "GiftAbuseFlag_kind_idx" ON "GiftAbuseFlag"("kind");

-- CreateIndex
CREATE INDEX "GiftAbuseFlag_createdAt_idx" ON "GiftAbuseFlag"("createdAt");

-- CreateIndex
CREATE INDEX "VideoGiftTypeSummary_videoId_idx" ON "VideoGiftTypeSummary"("videoId");

-- CreateIndex
CREATE INDEX "VideoGiftTypeSummary_giftId_idx" ON "VideoGiftTypeSummary"("giftId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoGiftTypeSummary_videoId_giftId_key" ON "VideoGiftTypeSummary"("videoId", "giftId");

-- CreateIndex
CREATE INDEX "VideoSupporterSummary_videoId_idx" ON "VideoSupporterSummary"("videoId");

-- CreateIndex
CREATE INDEX "VideoSupporterSummary_userId_idx" ON "VideoSupporterSummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSupporterSummary_videoId_userId_key" ON "VideoSupporterSummary"("videoId", "userId");

-- CreateIndex
CREATE INDEX "CreatorSupporterSummary_creatorId_idx" ON "CreatorSupporterSummary"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorSupporterSummary_userId_idx" ON "CreatorSupporterSummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSupporterSummary_creatorId_userId_key" ON "CreatorSupporterSummary"("creatorId", "userId");

-- CreateIndex
CREATE INDEX "CreatorEarningsLedger_creatorId_idx" ON "CreatorEarningsLedger"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorEarningsLedger_sourceType_sourceId_idx" ON "CreatorEarningsLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "CreatorEarningsLedger_createdAt_idx" ON "CreatorEarningsLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorEarningsSummary_creatorId_key" ON "CreatorEarningsSummary"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorEarningsSummary_creatorId_idx" ON "CreatorEarningsSummary"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorSupportWeekly_year_week_totalCoinsReceived_idx" ON "CreatorSupportWeekly"("year", "week", "totalCoinsReceived");

-- CreateIndex
CREATE INDEX "CreatorSupportWeekly_creatorId_idx" ON "CreatorSupportWeekly"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSupportWeekly_creatorId_year_week_key" ON "CreatorSupportWeekly"("creatorId", "year", "week");

-- CreateIndex
CREATE INDEX "PlatformRevenueLedger_sourceType_sourceId_idx" ON "PlatformRevenueLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PlatformRevenueLedger_createdAt_idx" ON "PlatformRevenueLedger"("createdAt");

-- CreateIndex
CREATE INDEX "CoinTransaction_fromUserId_idx" ON "CoinTransaction"("fromUserId");

-- CreateIndex
CREATE INDEX "CoinTransaction_toUserId_idx" ON "CoinTransaction"("toUserId");

-- CreateIndex
CREATE INDEX "CoinTransaction_videoId_idx" ON "CoinTransaction"("videoId");

-- CreateIndex
CREATE INDEX "CoinTransaction_type_idx" ON "CoinTransaction"("type");

-- CreateIndex
CREATE INDEX "CoinTransaction_createdAt_idx" ON "CoinTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_year_week_score_idx" ON "LeaderboardEntry"("year", "week", "score");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_videoId_year_week_key" ON "LeaderboardEntry"("videoId", "year", "week");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSupportStats_videoId_key" ON "VideoSupportStats"("videoId");

-- CreateIndex
CREATE INDEX "VideoSupportStats_videoId_idx" ON "VideoSupportStats"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRankingStats_videoId_key" ON "VideoRankingStats"("videoId");

-- CreateIndex
CREATE INDEX "VideoRankingStats_videoId_idx" ON "VideoRankingStats"("videoId");

-- CreateIndex
CREATE INDEX "VideoRankingStats_rankingScore_idx" ON "VideoRankingStats"("rankingScore");

-- CreateIndex
CREATE UNIQUE INDEX "VideoWatchStats_videoId_key" ON "VideoWatchStats"("videoId");

-- CreateIndex
CREATE INDEX "VideoWatchStats_videoId_idx" ON "VideoWatchStats"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAudioAnalysis_videoId_key" ON "VideoAudioAnalysis"("videoId");

-- CreateIndex
CREATE INDEX "VideoAudioAnalysis_videoId_idx" ON "VideoAudioAnalysis"("videoId");

-- CreateIndex
CREATE INDEX "VideoAudioAnalysis_analysisStatus_idx" ON "VideoAudioAnalysis"("analysisStatus");

-- CreateIndex
CREATE INDEX "VideoAudioAnalysis_overallVocalScore_idx" ON "VideoAudioAnalysis"("overallVocalScore");

-- CreateIndex
CREATE INDEX "VideoAudioAnalysis_analysisStatus_createdAt_idx" ON "VideoAudioAnalysis"("analysisStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaIntegrityAnalysis_videoId_key" ON "MediaIntegrityAnalysis"("videoId");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_videoId_idx" ON "MediaIntegrityAnalysis"("videoId");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_moderationStatus_idx" ON "MediaIntegrityAnalysis"("moderationStatus");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_originalityStatus_idx" ON "MediaIntegrityAnalysis"("originalityStatus");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_aiVoiceRiskLevel_idx" ON "MediaIntegrityAnalysis"("aiVoiceRiskLevel");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_audioFingerprint_idx" ON "MediaIntegrityAnalysis"("audioFingerprint");

-- CreateIndex
CREATE INDEX "MediaIntegrityAnalysis_videoFingerprint_idx" ON "MediaIntegrityAnalysis"("videoFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayoutProfile_userId_key" ON "CreatorPayoutProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorPayoutProfile_userId_idx" ON "CreatorPayoutProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorPayoutProfile_status_idx" ON "CreatorPayoutProfile"("status");

-- CreateIndex
CREATE INDEX "CreatorPayoutRecord_userId_idx" ON "CreatorPayoutRecord"("userId");

-- CreateIndex
CREATE INDEX "CreatorPayoutRecord_status_idx" ON "CreatorPayoutRecord"("status");

-- CreateIndex
CREATE INDEX "CreatorPayoutRecord_requestedAt_idx" ON "CreatorPayoutRecord"("requestedAt");

-- CreateIndex
CREATE INDEX "FraudEvent_userId_idx" ON "FraudEvent"("userId");

-- CreateIndex
CREATE INDEX "FraudEvent_eventType_idx" ON "FraudEvent"("eventType");

-- CreateIndex
CREATE INDEX "FraudEvent_riskLevel_idx" ON "FraudEvent"("riskLevel");

-- CreateIndex
CREATE INDEX "FraudEvent_createdAt_idx" ON "FraudEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRiskProfile_userId_key" ON "AccountRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "AccountRiskProfile_userId_idx" ON "AccountRiskProfile"("userId");

-- CreateIndex
CREATE INDEX "AccountRiskProfile_riskLevel_idx" ON "AccountRiskProfile"("riskLevel");

-- CreateIndex
CREATE INDEX "AccountRiskProfile_payoutBlocked_idx" ON "AccountRiskProfile"("payoutBlocked");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_userId_idx" ON "SupportReviewFlag"("userId");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_targetUserId_idx" ON "SupportReviewFlag"("targetUserId");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_videoId_idx" ON "SupportReviewFlag"("videoId");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_status_idx" ON "SupportReviewFlag"("status");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_type_idx" ON "SupportReviewFlag"("type");

-- CreateIndex
CREATE INDEX "SupportReviewFlag_createdAt_idx" ON "SupportReviewFlag"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationActionLog_moderatorId_idx" ON "ModerationActionLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ModerationActionLog_targetType_idx" ON "ModerationActionLog"("targetType");

-- CreateIndex
CREATE INDEX "ModerationActionLog_targetId_idx" ON "ModerationActionLog"("targetId");

-- CreateIndex
CREATE INDEX "ModerationActionLog_createdAt_idx" ON "ModerationActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationNote_targetType_idx" ON "ModerationNote"("targetType");

-- CreateIndex
CREATE INDEX "ModerationNote_targetId_idx" ON "ModerationNote"("targetId");

-- CreateIndex
CREATE INDEX "ModerationNote_createdAt_idx" ON "ModerationNote"("createdAt");

-- AddForeignKey
ALTER TABLE "CreatorVerification" ADD CONSTRAINT "CreatorVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeWinner" ADD CONSTRAINT "ChallengeWinner_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeWinner" ADD CONSTRAINT "ChallengeWinner_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBattle" ADD CONSTRAINT "LiveBattle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBattleParticipant" ADD CONSTRAINT "LiveBattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "LiveBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveBattleParticipant" ADD CONSTRAINT "LiveBattleParticipant_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleVote" ADD CONSTRAINT "BattleVote_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "LiveBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleVote" ADD CONSTRAINT "BattleVote_recipientCreatorId_fkey" FOREIGN KEY ("recipientCreatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleVote" ADD CONSTRAINT "BattleVote_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleWinner" ADD CONSTRAINT "BattleWinner_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "LiveBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleWinner" ADD CONSTRAINT "BattleWinner_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleWinner" ADD CONSTRAINT "BattleWinner_loserId_fkey" FOREIGN KEY ("loserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinPurchaseOrder" ADD CONSTRAINT "CoinPurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinPurchaseOrder" ADD CONSTRAINT "CoinPurchaseOrder_coinPackageId_fkey" FOREIGN KEY ("coinPackageId") REFERENCES "CoinPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftTransaction" ADD CONSTRAINT "GiftTransaction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftTransaction" ADD CONSTRAINT "GiftTransaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftTransaction" ADD CONSTRAINT "GiftTransaction_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftTransaction" ADD CONSTRAINT "GiftTransaction_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoGiftTypeSummary" ADD CONSTRAINT "VideoGiftTypeSummary_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoGiftTypeSummary" ADD CONSTRAINT "VideoGiftTypeSummary_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSupporterSummary" ADD CONSTRAINT "VideoSupporterSummary_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSupporterSummary" ADD CONSTRAINT "VideoSupporterSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSupporterSummary" ADD CONSTRAINT "CreatorSupporterSummary_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSupporterSummary" ADD CONSTRAINT "CreatorSupporterSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEarningsLedger" ADD CONSTRAINT "CreatorEarningsLedger_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorEarningsSummary" ADD CONSTRAINT "CreatorEarningsSummary_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSupportWeekly" ADD CONSTRAINT "CreatorSupportWeekly_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSupportStats" ADD CONSTRAINT "VideoSupportStats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRankingStats" ADD CONSTRAINT "VideoRankingStats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWatchStats" ADD CONSTRAINT "VideoWatchStats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAudioAnalysis" ADD CONSTRAINT "VideoAudioAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaIntegrityAnalysis" ADD CONSTRAINT "MediaIntegrityAnalysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayoutProfile" ADD CONSTRAINT "CreatorPayoutProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayoutRecord" ADD CONSTRAINT "CreatorPayoutRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudEvent" ADD CONSTRAINT "FraudEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRiskProfile" ADD CONSTRAINT "AccountRiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportReviewFlag" ADD CONSTRAINT "SupportReviewFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportReviewFlag" ADD CONSTRAINT "SupportReviewFlag_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationActionLog" ADD CONSTRAINT "ModerationActionLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationNote" ADD CONSTRAINT "ModerationNote_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
