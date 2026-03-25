-- AlterTable: Add acceptedTermsAt to User
ALTER TABLE "User" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);

-- AlterEnum: Add INAPPROPRIATE to ContentReportType
ALTER TYPE "ContentReportType" ADD VALUE 'INAPPROPRIATE';

-- AlterTable: Add reportCount and isFlagged to Video
ALTER TABLE "Video" ADD COLUMN "reportCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false;
