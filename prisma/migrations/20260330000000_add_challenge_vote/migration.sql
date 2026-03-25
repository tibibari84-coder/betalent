-- CreateTable
CREATE TABLE "ChallengeVote" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeVote_challengeId_idx" ON "ChallengeVote"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeVote_videoId_idx" ON "ChallengeVote"("videoId");

-- CreateIndex
CREATE INDEX "ChallengeVote_challengeId_videoId_idx" ON "ChallengeVote"("challengeId", "videoId");

-- CreateIndex
CREATE INDEX "ChallengeVote_voterUserId_idx" ON "ChallengeVote"("voterUserId");

-- CreateIndex
CREATE INDEX "ChallengeVote_voterUserId_createdAt_idx" ON "ChallengeVote"("voterUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeVote_challengeId_videoId_voterUserId_key" ON "ChallengeVote"("challengeId", "videoId", "voterUserId");

-- AddForeignKey
ALTER TABLE "ChallengeVote" ADD CONSTRAINT "ChallengeVote_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeVote" ADD CONSTRAINT "ChallengeVote_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeVote" ADD CONSTRAINT "ChallengeVote_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeVote" ADD CONSTRAINT "ChallengeVote_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
