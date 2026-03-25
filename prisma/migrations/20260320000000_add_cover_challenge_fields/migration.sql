-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "artistTheme" TEXT;
ALTER TABLE "Challenge" ADD COLUMN "weekIndex" INTEGER;
ALTER TABLE "Challenge" ADD COLUMN "maxDurationSec" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "Challenge" ADD COLUMN "liveEventAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChallengeEntry" ADD COLUMN "styleSlug" TEXT;

-- CreateIndex
CREATE INDEX "Challenge_weekIndex_idx" ON "Challenge"("weekIndex");
