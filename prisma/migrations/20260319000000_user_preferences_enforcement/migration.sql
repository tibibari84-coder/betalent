-- CreateEnum
CREATE TYPE "ProfileVisibilityLevel" AS ENUM ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE');

-- CommentPermission is re-declared in 20260404000000; needed here for defaultCommentPermission (shadow replay order).
DO $$ BEGIN
  CREATE TYPE "CommentPermission" AS ENUM ('EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "profileVisibility" "ProfileVisibilityLevel" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "User" ADD COLUMN "defaultCommentPermission" "CommentPermission" NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "User" ADD COLUMN "allowVotesOnPerformances" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyChallenges" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyVotes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyFollowers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyComments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifyAnnouncements" BOOLEAN NOT NULL DEFAULT true;
