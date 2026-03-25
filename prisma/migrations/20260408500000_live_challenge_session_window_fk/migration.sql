-- Link LiveChallengeSession → ChallengeWindow (DDL via EXECUTE: valid inside PL/pgSQL).
-- Skips cleanly when LiveChallengeSession does not exist (e.g. shadow replay before live tables exist).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LiveChallengeSession'
  ) THEN
    EXECUTE 'ALTER TABLE "LiveChallengeSession" ADD COLUMN IF NOT EXISTS "windowId" TEXT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "LiveChallengeSession_windowId_idx" ON "LiveChallengeSession"("windowId")';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveChallengeSession_windowId_fkey') THEN
      EXECUTE
        'ALTER TABLE "LiveChallengeSession" ADD CONSTRAINT "LiveChallengeSession_windowId_fkey" '
        || 'FOREIGN KEY ("windowId") REFERENCES "ChallengeWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE';
    END IF;
  END IF;
END $$;
