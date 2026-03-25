-- Add PROCESSING_AUDIO to ProcessingStatus enum for premium upload audio pipeline.
DO $$
DECLARE
  tid OID;
BEGIN
  SELECT oid INTO tid FROM pg_type WHERE typname = 'ProcessingStatus';
  IF tid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = tid AND enumlabel = 'PROCESSING_AUDIO'
  ) THEN
    ALTER TYPE "ProcessingStatus" ADD VALUE 'PROCESSING_AUDIO' AFTER 'GENERATING_THUMBNAIL';
  END IF;
END
$$;
