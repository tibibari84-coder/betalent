-- Video pipeline: processing retry counter + visibility/moderation enum extensions.
ALTER TYPE "VideoVisibility" ADD VALUE 'UNLISTED';
ALTER TYPE "VideoModerationStatus" ADD VALUE 'NEEDS_REVIEW';

ALTER TABLE "Video" ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0;
