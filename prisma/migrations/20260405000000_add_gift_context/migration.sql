-- CreateEnum
CREATE TYPE "GiftContext" AS ENUM ('FORYOU', 'CHALLENGE');

-- AlterTable
ALTER TABLE "GiftTransaction" ADD COLUMN "context" "GiftContext" NOT NULL DEFAULT 'FORYOU';
