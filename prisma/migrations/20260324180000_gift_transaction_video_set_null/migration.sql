-- GiftTransaction: keep financial rows when Video is deleted; drop FK to video only for audit linkage.
ALTER TABLE "GiftTransaction" DROP CONSTRAINT IF EXISTS "GiftTransaction_videoId_fkey";

ALTER TABLE "GiftTransaction" ALTER COLUMN "videoId" DROP NOT NULL;

ALTER TABLE "GiftTransaction" ADD CONSTRAINT "GiftTransaction_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
