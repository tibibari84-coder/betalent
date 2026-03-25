-- Weekly Live Challenge Arena entry lifecycle normalization
-- Idempotent: ensures ChallengeWindow exists before ChallengeEntry → windowId FK (shadow replay + out-of-order DBs).
CREATE TABLE IF NOT EXISTS "ChallengeWindow" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "regionLabel" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChallengeWindow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChallengeWindow_challengeId_idx" ON "ChallengeWindow"("challengeId");
CREATE INDEX IF NOT EXISTS "ChallengeWindow_startsAt_idx" ON "ChallengeWindow"("startsAt");
ALTER TABLE "ChallengeWindow" DROP CONSTRAINT IF EXISTS "ChallengeWindow_challengeId_fkey";
ALTER TABLE "ChallengeWindow" ADD CONSTRAINT "ChallengeWindow_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChallengeEntryStatus') THEN
    CREATE TYPE "ChallengeEntryStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');
  END IF;
END $$;

ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "status" "ChallengeEntryStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "windowId" TEXT;
ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ChallengeEntry" ADD COLUMN IF NOT EXISTS "withdrawnAt" TIMESTAMP(3);

UPDATE "ChallengeEntry"
SET "joinedAt" = "createdAt"
WHERE "joinedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "ChallengeEntry_status_idx" ON "ChallengeEntry"("status");
CREATE INDEX IF NOT EXISTS "ChallengeEntry_windowId_idx" ON "ChallengeEntry"("windowId");
CREATE INDEX IF NOT EXISTS "ChallengeEntry_challengeId_status_joinedAt_idx" ON "ChallengeEntry"("challengeId", "status", "joinedAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeEntry_windowId_fkey'
  ) THEN
    ALTER TABLE "ChallengeEntry"
      ADD CONSTRAINT "ChallengeEntry_windowId_fkey"
      FOREIGN KEY ("windowId") REFERENCES "ChallengeWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
