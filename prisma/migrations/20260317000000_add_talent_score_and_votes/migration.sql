-- AlterTable
ALTER TABLE "Video" ADD COLUMN "votesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "talentScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Vote" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_videoId_key" ON "Vote"("userId", "videoId");

-- CreateIndex
CREATE INDEX "Vote_videoId_idx" ON "Vote"("videoId");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE INDEX "Video_talentScore_idx" ON "Video"("talentScore");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddConstraint: value between 1 and 10
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_value_range" CHECK ("value" >= 1 AND "value" <= 10);
