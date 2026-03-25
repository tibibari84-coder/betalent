-- Add User.isTestAccount and User.isSeedAccount for schema-level actor trust
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTestAccount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSeedAccount" BOOLEAN NOT NULL DEFAULT false;

-- Add FollowSource enum and Follow.source
DO $$ BEGIN
  CREATE TYPE "FollowSource" AS ENUM ('ORGANIC', 'SEED', 'ONBOARDING', 'DEMO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "Follow" ADD COLUMN IF NOT EXISTS "source" "FollowSource" NOT NULL DEFAULT 'ORGANIC';

-- Backfill: mark seed/test users (one-time; email heuristic for existing data)
UPDATE "User" SET "isSeedAccount" = true
WHERE (
  LOWER("email") LIKE '%@betalent.local'
  OR LOWER("email") LIKE '%@test.%'
  OR LOWER("email") LIKE 'test@%'
  OR LOWER("email") LIKE '%@seed.%'
  OR LOWER("email") LIKE 'seed@%'
);

-- Backfill: mark seed follows (follows from seed users)
UPDATE "Follow" SET "source" = 'SEED'
WHERE "followerId" IN (SELECT id FROM "User" WHERE "isSeedAccount" = true);

CREATE INDEX IF NOT EXISTS "Follow_source_idx" ON "Follow"("source");
