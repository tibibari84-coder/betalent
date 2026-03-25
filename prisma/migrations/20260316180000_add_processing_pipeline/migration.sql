-- Add new processing pipeline columns to Video (thumbnail + processing pipeline)
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "processingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "processingError" TEXT;

-- Add new ProcessingStatus enum values if the type exists (e.g. after upload/processing columns were added)
DO $$
DECLARE
  tid OID;
BEGIN
  SELECT oid INTO tid FROM pg_type WHERE typname = 'ProcessingStatus';
  IF tid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'PENDING_PROCESSING') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'PENDING_PROCESSING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'GENERATING_THUMBNAIL') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'GENERATING_THUMBNAIL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'ANALYZING_AUDIO') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'ANALYZING_AUDIO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'CHECKING_INTEGRITY') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'CHECKING_INTEGRITY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'PROCESSING_FAILED') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'PROCESSING_FAILED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'FLAGGED') THEN
      ALTER TYPE "ProcessingStatus" ADD VALUE 'FLAGGED';
    END IF;
  END IF;
END $$;
