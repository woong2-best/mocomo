-- Support tier restructure: Seed → Cosmic (17 tiers, USD thresholds)

CREATE TYPE "SupportTierLevel_new" AS ENUM (
  'SEED',
  'STONE',
  'BRONZE',
  'SILVER',
  'GOLD',
  'CRYSTAL',
  'EMERALD',
  'SAPPHIRE',
  'RUBY',
  'DIAMOND',
  'MYTHRIL',
  'ORICHALCUM',
  'LUNA',
  'TERRA',
  'JUPITER',
  'ASTRAL',
  'COSMIC'
);

CREATE OR REPLACE FUNCTION map_support_tier(old_tier text) RETURNS text AS $$
BEGIN
  RETURN CASE old_tier
    WHEN 'PEBBLE' THEN 'SEED'
    WHEN 'COAL' THEN 'STONE'
    WHEN 'IRON' THEN 'STONE'
    WHEN 'PLATINUM' THEN 'GOLD'
    WHEN 'CELESTITE' THEN 'ASTRAL'
    WHEN 'ETERNAL' THEN 'COSMIC'
    ELSE old_tier
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE "User" ALTER COLUMN "supportTierSent" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "supportTierSent" TYPE "SupportTierLevel_new"
  USING (map_support_tier("supportTierSent"::text))::"SupportTierLevel_new";
ALTER TABLE "User" ALTER COLUMN "supportTierSent" SET DEFAULT 'SEED';

ALTER TABLE "User" ALTER COLUMN "supportTierReceived" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "supportTierReceived" TYPE "SupportTierLevel_new"
  USING (map_support_tier("supportTierReceived"::text))::"SupportTierLevel_new";
ALTER TABLE "User" ALTER COLUMN "supportTierReceived" SET DEFAULT 'SEED';

ALTER TABLE "VoiceChannel" ALTER COLUMN "minViewerTier" TYPE "SupportTierLevel_new"
  USING (
    CASE
      WHEN "minViewerTier" IS NULL THEN NULL
      ELSE (map_support_tier("minViewerTier"::text))::"SupportTierLevel_new"
    END
  );

ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" DROP DEFAULT;
ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" TYPE "SupportTierLevel_new"
  USING (map_support_tier("minChatTier"::text))::"SupportTierLevel_new";
ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" SET DEFAULT 'STONE';

ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" TYPE "SupportTierLevel_new"
  USING (map_support_tier("tier"::text))::"SupportTierLevel_new";
ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" SET DEFAULT 'SEED';

DROP TYPE "SupportTierLevel";
ALTER TYPE "SupportTierLevel_new" RENAME TO "SupportTierLevel";

DROP FUNCTION map_support_tier(text);
