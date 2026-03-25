-- Weekly Global Live Challenge — part 2a: ChallengeWindow only (must commit even if later data migration fails).

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
