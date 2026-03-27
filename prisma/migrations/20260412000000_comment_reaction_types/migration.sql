-- CreateEnum
CREATE TYPE "CommentReactionType" AS ENUM ('LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY');

-- AlterTable
ALTER TABLE "CommentLike" ADD COLUMN "reaction" "CommentReactionType" NOT NULL DEFAULT 'LIKE';

-- CreateIndex
CREATE INDEX "CommentLike_commentId_reaction_idx" ON "CommentLike"("commentId", "reaction");
