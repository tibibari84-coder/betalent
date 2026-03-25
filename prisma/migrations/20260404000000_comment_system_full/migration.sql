-- CreateEnum (may already exist from 20260319000000_user_preferences_enforcement)
DO $$ BEGIN
  CREATE TYPE "CommentPermission" AS ENUM ('EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Video: add commentPermission
ALTER TABLE "Video" ADD COLUMN "commentPermission" "CommentPermission" NOT NULL DEFAULT 'EVERYONE';

-- AlterTable Comment: add isDeleted, likeCount, replyCount, editedAt
ALTER TABLE "Comment" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comment" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN "editedAt" TIMESTAMP(3);

-- Backfill replyCount for existing parent comments
UPDATE "Comment" c
SET "replyCount" = sub.cnt
FROM (
  SELECT "parentId", COUNT(*)::int as cnt
  FROM "Comment"
  WHERE "parentId" IS NOT NULL AND "isDeleted" = false
  GROUP BY "parentId"
) sub
WHERE c.id = sub."parentId" AND c."parentId" IS NULL;

-- CreateIndex for efficient top-level + replies fetch
CREATE INDEX "Comment_videoId_parentId_idx" ON "Comment"("videoId", "parentId");
