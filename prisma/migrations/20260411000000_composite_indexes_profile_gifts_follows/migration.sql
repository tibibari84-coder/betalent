-- Composite indexes: profile video lists, gift ledger timelines, follower lists (see schema.prisma).
-- Aligns DB with Prisma schema + `migrate diff` drift.

ALTER TABLE "ChallengeEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX "Follow_creatorId_createdAt_idx" ON "Follow"("creatorId", "createdAt" DESC);

CREATE INDEX "GiftTransaction_receiverId_createdAt_idx" ON "GiftTransaction"("receiverId", "createdAt" DESC);

CREATE INDEX "GiftTransaction_senderId_createdAt_idx" ON "GiftTransaction"("senderId", "createdAt" DESC);

CREATE INDEX "Video_creatorId_createdAt_idx" ON "Video"("creatorId", "createdAt" DESC);

CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt" DESC);
