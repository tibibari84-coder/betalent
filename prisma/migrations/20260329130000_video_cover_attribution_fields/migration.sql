-- Optional cover attribution (MVP: not required to publish when contentType = COVER)
ALTER TABLE "Video" ADD COLUMN "coverOriginalArtistName" TEXT;
ALTER TABLE "Video" ADD COLUMN "coverSongTitle" TEXT;
