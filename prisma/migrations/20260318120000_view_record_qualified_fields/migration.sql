-- AlterTable
ALTER TABLE "ViewRecord" ADD COLUMN "qualifiedWatchSec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ViewRecord" ADD COLUMN "viewerIpHash" TEXT;

-- CreateIndex
CREATE INDEX "ViewRecord_videoId_createdAt_idx" ON "ViewRecord"("videoId", "createdAt");
