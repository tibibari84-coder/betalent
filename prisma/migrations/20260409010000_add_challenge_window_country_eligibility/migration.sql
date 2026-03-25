CREATE TABLE IF NOT EXISTS "ChallengeWindowCountryEligibility" (
  "id" TEXT NOT NULL,
  "windowId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallengeWindowCountryEligibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeWindowCountryEligibility_windowId_countryCode_key"
  ON "ChallengeWindowCountryEligibility"("windowId", "countryCode");

CREATE INDEX IF NOT EXISTS "ChallengeWindowCountryEligibility_countryCode_idx"
  ON "ChallengeWindowCountryEligibility"("countryCode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeWindowCountryEligibility_windowId_fkey'
  ) THEN
    ALTER TABLE "ChallengeWindowCountryEligibility"
      ADD CONSTRAINT "ChallengeWindowCountryEligibility_windowId_fkey"
      FOREIGN KEY ("windowId") REFERENCES "ChallengeWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
