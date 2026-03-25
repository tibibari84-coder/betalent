-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('DRAFT', 'UPLOADING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING_PROCESSING', 'GENERATING_THUMBNAIL', 'PROCESSING_AUDIO', 'ANALYZING_AUDIO', 'CHECKING_INTEGRITY', 'READY', 'PROCESSING_FAILED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "VideoModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'BLOCKED');

-- AlterTable
ALTER TABLE "ShareEvent" ADD COLUMN     "referrerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referrerId" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "moderationStatus" "VideoModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING_PROCESSING',
ADD COLUMN     "sharesLast24h" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "videoUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "videoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referredUserId_idx" ON "Referral"("referredUserId");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE INDEX "Video_uploadStatus_idx" ON "Video"("uploadStatus");

-- CreateIndex
CREATE INDEX "Video_processingStatus_idx" ON "Video"("processingStatus");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
