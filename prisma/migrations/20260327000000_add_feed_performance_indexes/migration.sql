-- CreateIndex
CREATE INDEX "ChallengeEntry_videoId_idx" ON "ChallengeEntry"("videoId");

-- CreateIndex
CREATE INDEX "GiftTransaction_videoId_createdAt_idx" ON "GiftTransaction"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Like_createdAt_idx" ON "Like"("createdAt");

-- CreateIndex
CREATE INDEX "UserWatchInteraction_userId_lastWatchedAt_idx" ON "UserWatchInteraction"("userId", "lastWatchedAt");

-- CreateIndex
CREATE INDEX "VideoWatchStats_viewCount_completedViewsCount_totalWatchSec_idx" ON "VideoWatchStats"("viewCount", "completedViewsCount" DESC, "totalWatchSeconds" DESC);
