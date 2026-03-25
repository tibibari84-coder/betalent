-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ORIGINAL', 'COVER', 'REMIX');

-- CreateEnum (may already exist from 20260318120000_comment_social_layer shadow-safe replay)
DO $$ BEGIN
  CREATE TYPE "ContentReportType" AS ENUM ('FAKE_PERFORMANCE', 'COPYRIGHT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "ModerationTargetType" ADD VALUE 'CONTENT_REPORT';

-- AlterEnum
ALTER TYPE "ModerationActionType" ADD VALUE 'DISMISS_REPORT';
ALTER TYPE "ModerationActionType" ADD VALUE 'UPHOLD_REPORT';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "contentLicensingEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'ORIGINAL';

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "reportType" "ContentReportType" NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReport_videoId_idx" ON "ContentReport"("videoId");

-- CreateIndex
CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

-- CreateIndex
CREATE INDEX "ContentReport_reportType_idx" ON "ContentReport"("reportType");

-- CreateIndex
CREATE INDEX "ContentReport_createdAt_idx" ON "ContentReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_reporterId_videoId_reportType_key" ON "ContentReport"("reporterId", "videoId", "reportType");

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
