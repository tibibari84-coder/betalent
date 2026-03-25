-- AlterTable
ALTER TABLE "Video" ADD COLUMN "rankingBoostMultiplier" DOUBLE PRECISION,
ADD COLUMN "rankingDisabled" BOOLEAN NOT NULL DEFAULT false;
