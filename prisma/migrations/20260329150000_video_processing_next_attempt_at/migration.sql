-- Exponential backoff: worker only retries after processingNextAttemptAt.
ALTER TABLE "Video" ADD COLUMN "processingNextAttemptAt" TIMESTAMP(3);
