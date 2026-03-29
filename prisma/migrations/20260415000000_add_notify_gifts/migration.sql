-- Separate gift alerts from like alerts in notification preferences.
ALTER TABLE "User" ADD COLUMN "notifyGifts" BOOLEAN NOT NULL DEFAULT true;
