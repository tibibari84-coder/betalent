-- CreateEnum
CREATE TYPE "CreatorRecommendationDismissalReason" AS ENUM ('NOT_INTERESTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "CreatorRecommendationDismissal" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "reason" "CreatorRecommendationDismissalReason" NOT NULL DEFAULT 'NOT_INTERESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorRecommendationDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRecommendationDismissal_viewerUserId_creatorUserId_key" ON "CreatorRecommendationDismissal"("viewerUserId", "creatorUserId");

-- CreateIndex
CREATE INDEX "CreatorRecommendationDismissal_viewerUserId_idx" ON "CreatorRecommendationDismissal"("viewerUserId");

-- CreateIndex
CREATE INDEX "CreatorRecommendationDismissal_creatorUserId_idx" ON "CreatorRecommendationDismissal"("creatorUserId");

-- AddForeignKey
ALTER TABLE "CreatorRecommendationDismissal" ADD CONSTRAINT "CreatorRecommendationDismissal_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRecommendationDismissal" ADD CONSTRAINT "CreatorRecommendationDismissal_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
