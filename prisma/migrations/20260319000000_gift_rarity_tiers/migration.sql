-- AlterEnum: Migrate GiftRarityTier from BASIC/PREMIUM/RARE/LEGENDARY to COMMON/RARE/EPIC/LEGENDARY/MYTHIC
CREATE TYPE "GiftRarityTier_new" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

ALTER TABLE "Gift" ALTER COLUMN "rarityTier" DROP DEFAULT;

ALTER TABLE "Gift" 
  ALTER COLUMN "rarityTier" TYPE "GiftRarityTier_new" 
  USING (
    CASE "rarityTier"::text
      WHEN 'BASIC' THEN 'COMMON'::"GiftRarityTier_new"
      WHEN 'PREMIUM' THEN 'RARE'::"GiftRarityTier_new"
      WHEN 'RARE' THEN 'EPIC'::"GiftRarityTier_new"
      WHEN 'LEGENDARY' THEN 'LEGENDARY'::"GiftRarityTier_new"
      ELSE 'COMMON'::"GiftRarityTier_new"
    END
  );

ALTER TABLE "Gift" ALTER COLUMN "rarityTier" SET DEFAULT 'COMMON'::"GiftRarityTier_new";

DROP TYPE "GiftRarityTier";

ALTER TYPE "GiftRarityTier_new" RENAME TO "GiftRarityTier";
