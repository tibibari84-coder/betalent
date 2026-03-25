-- AlterTable: User.uploadLimitSec default 60 -> 90
-- AlterTable: Challenge.maxDurationSec default 120 -> 90
-- Single source of truth: standard videos 90s, live performances 150s

ALTER TABLE "User" ALTER COLUMN "uploadLimitSec" SET DEFAULT 90;

ALTER TABLE "Challenge" ALTER COLUMN "maxDurationSec" SET DEFAULT 90;
