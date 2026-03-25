-- CreateTable
CREATE TABLE "UserWatchInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "watchTimeSec" INTEGER NOT NULL DEFAULT 0,
    "completedPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRewatch" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWatchInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWatchInteraction_userId_videoId_key" ON "UserWatchInteraction"("userId", "videoId");

-- CreateIndex
CREATE INDEX "UserWatchInteraction_userId_idx" ON "UserWatchInteraction"("userId");

-- CreateIndex
CREATE INDEX "UserWatchInteraction_videoId_idx" ON "UserWatchInteraction"("videoId");

-- CreateIndex
CREATE INDEX "UserWatchInteraction_lastWatchedAt_idx" ON "UserWatchInteraction"("lastWatchedAt");

-- AddForeignKey
ALTER TABLE "UserWatchInteraction" ADD CONSTRAINT "UserWatchInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWatchInteraction" ADD CONSTRAINT "UserWatchInteraction_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- @updatedAt: no DB default (was incorrectly applied in 20260318160230 before this table existed)
ALTER TABLE "UserWatchInteraction" ALTER COLUMN "lastWatchedAt" DROP DEFAULT;
