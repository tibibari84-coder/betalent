-- GiftContext: LIVE for unified live-session gifts
DO $$ BEGIN
  ALTER TYPE "GiftContext" ADD VALUE 'LIVE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- VideoSupportStats: For You gift signals (separate from challenge super-vote + challenge gift bucket)
ALTER TABLE "VideoSupportStats" ADD COLUMN IF NOT EXISTS "forYouGiftCoinsTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VideoSupportStats" ADD COLUMN IF NOT EXISTS "recentGiftVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "VideoSupportStats" ADD COLUMN IF NOT EXISTS "lastGiftVelocityAt" TIMESTAMP(3);

-- Streak: same user, same video, within session window
ALTER TABLE "VideoSupporterSummary" ADD COLUMN IF NOT EXISTS "sessionStreakCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VideoSupporterSummary" ADD COLUMN IF NOT EXISTS "lastStreakAt" TIMESTAMP(3);

-- Live session link on gift tx (when context = LIVE)
ALTER TABLE "GiftTransaction" ADD COLUMN IF NOT EXISTS "liveSessionId" TEXT;

CREATE INDEX IF NOT EXISTS "GiftTransaction_liveSessionId_idx" ON "GiftTransaction"("liveSessionId");
