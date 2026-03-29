-- AlterTable
ALTER TABLE "Video" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Video_deletedAt_idx" ON "Video"("deletedAt");

-- CreateTable
CREATE TABLE "VideoDeleteRetry" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "failedKeys" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoDeleteRetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoDeleteRetry_videoId_key" ON "VideoDeleteRetry"("videoId");

-- CreateIndex
CREATE INDEX "VideoDeleteRetry_videoId_idx" ON "VideoDeleteRetry"("videoId");

-- AddForeignKey
ALTER TABLE "VideoDeleteRetry" ADD CONSTRAINT "VideoDeleteRetry_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
