-- CreateTable
CREATE TABLE "ViewRecord" (
    "id" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewRecord_viewerKey_videoId_idx" ON "ViewRecord"("viewerKey", "videoId");

-- CreateIndex
CREATE INDEX "ViewRecord_createdAt_idx" ON "ViewRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "ViewRecord" ADD CONSTRAINT "ViewRecord_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
