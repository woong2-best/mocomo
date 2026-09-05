-- Subculture commerce metadata for Used + Marketplace listings

CREATE TYPE "SubcultureConditionGrade" AS ENUM (
  'NEW',
  'LIKE_NEW',
  'NM',
  'LP',
  'MP',
  'HP',
  'POOR',
  'UNKNOWN'
);

CREATE TYPE "SubcultureLimitedKind" AS ENUM (
  'STANDARD',
  'EVENT_EXCLUSIVE',
  'VENUE_ONLY',
  'PREORDER',
  'COLLAB',
  'LIMITED_RUN',
  'LOTTERY',
  'PROMO'
);

CREATE TYPE "SubcultureListingFormat" AS ENUM (
  'SINGLE',
  'LOT',
  'SET',
  'BINDER',
  'BOX'
);

CREATE TYPE "SubcultureTradeMode" AS ENUM (
  'SELL',
  'TRADE',
  'SELL_OR_TRADE'
);

CREATE TYPE "SubcultureItemOrigin" AS ENUM (
  'OFFICIAL',
  'FANMADE',
  'BOOTLEG_UNKNOWN'
);

CREATE TYPE "SubculturePackagingState" AS ENUM (
  'SEALED',
  'OPENED_COMPLETE',
  'OPENED_INCOMPLETE',
  'LOOSE',
  'NA'
);

ALTER TABLE "UsedListing"
  ADD COLUMN IF NOT EXISTS "characterName" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "conditionGrade" "SubcultureConditionGrade",
  ADD COLUMN IF NOT EXISTS "limitedKind" "SubcultureLimitedKind",
  ADD COLUMN IF NOT EXISTS "listingFormat" "SubcultureListingFormat",
  ADD COLUMN IF NOT EXISTS "tradeMode" "SubcultureTradeMode" NOT NULL DEFAULT 'SELL',
  ADD COLUMN IF NOT EXISTS "itemOrigin" "SubcultureItemOrigin",
  ADD COLUMN IF NOT EXISTS "packagingState" "SubculturePackagingState",
  ADD COLUMN IF NOT EXISTS "subcultureMeta" JSONB;

CREATE INDEX IF NOT EXISTS "UsedListing_characterName_idx" ON "UsedListing"("characterName");
CREATE INDEX IF NOT EXISTS "UsedListing_conditionGrade_idx" ON "UsedListing"("conditionGrade");
CREATE INDEX IF NOT EXISTS "UsedListing_limitedKind_idx" ON "UsedListing"("limitedKind");
CREATE INDEX IF NOT EXISTS "UsedListing_tradeMode_idx" ON "UsedListing"("tradeMode");

ALTER TABLE "MarketplaceListing"
  ADD COLUMN IF NOT EXISTS "workTitle" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "productType" VARCHAR(40),
  ADD COLUMN IF NOT EXISTS "characterName" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "conditionGrade" "SubcultureConditionGrade",
  ADD COLUMN IF NOT EXISTS "limitedKind" "SubcultureLimitedKind",
  ADD COLUMN IF NOT EXISTS "listingFormat" "SubcultureListingFormat",
  ADD COLUMN IF NOT EXISTS "tradeMode" "SubcultureTradeMode" NOT NULL DEFAULT 'SELL',
  ADD COLUMN IF NOT EXISTS "itemOrigin" "SubcultureItemOrigin",
  ADD COLUMN IF NOT EXISTS "packagingState" "SubculturePackagingState",
  ADD COLUMN IF NOT EXISTS "subcultureMeta" JSONB;

CREATE INDEX IF NOT EXISTS "MarketplaceListing_workTitle_idx" ON "MarketplaceListing"("workTitle");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_productType_idx" ON "MarketplaceListing"("productType");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_tradeMode_idx" ON "MarketplaceListing"("tradeMode");
