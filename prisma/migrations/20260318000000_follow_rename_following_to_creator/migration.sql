-- Rename Follow.followingId to creatorId (same meaning, user-requested field name)
-- Step 1: Drop unique constraint and FK that reference followingId
DROP INDEX IF EXISTS "Follow_followerId_followingId_key";
ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followingId_fkey";
DROP INDEX IF EXISTS "Follow_followingId_idx";

-- Step 2: Rename column
ALTER TABLE "Follow" RENAME COLUMN "followingId" TO "creatorId";

-- Step 3: Recreate index and constraints
CREATE INDEX "Follow_creatorId_idx" ON "Follow"("creatorId");
CREATE UNIQUE INDEX "Follow_followerId_creatorId_key" ON "Follow"("followerId", "creatorId");
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
