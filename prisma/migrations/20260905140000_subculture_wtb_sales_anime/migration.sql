-- Anime wiki link, WTB alerts, sale records

ALTER TABLE "UsedListing"
  ADD COLUMN IF NOT EXISTS "animeSlug" VARCHAR(120);

CREATE INDEX IF NOT EXISTS "UsedListing_animeSlug_idx" ON "UsedListing"("animeSlug");

ALTER TABLE "MarketplaceListing"
  ADD COLUMN IF NOT EXISTS "animeSlug" VARCHAR(120);

CREATE INDEX IF NOT EXISTS "MarketplaceListing_animeSlug_idx" ON "MarketplaceListing"("animeSlug");

CREATE TABLE IF NOT EXISTS "SubcultureWtbAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workTitle" VARCHAR(120),
  "animeSlug" VARCHAR(120),
  "productType" VARCHAR(40),
  "characterName" VARCHAR(80),
  "maxPrice" INTEGER,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'krw',
  "note" VARCHAR(200),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubcultureWtbAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubcultureWtbAlert_userId_active_createdAt_idx"
  ON "SubcultureWtbAlert"("userId", "active", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SubcultureWtbAlert_animeSlug_productType_active_idx"
  ON "SubcultureWtbAlert"("animeSlug", "productType", "active");
CREATE INDEX IF NOT EXISTS "SubcultureWtbAlert_workTitle_productType_active_idx"
  ON "SubcultureWtbAlert"("workTitle", "productType", "active");

ALTER TABLE "SubcultureWtbAlert"
  ADD CONSTRAINT "SubcultureWtbAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SubcultureSaleRecord" (
  "id" TEXT NOT NULL,
  "listingId" TEXT,
  "sellerId" TEXT NOT NULL,
  "soldPrice" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'krw',
  "workTitle" VARCHAR(120),
  "animeSlug" VARCHAR(120),
  "productType" VARCHAR(40),
  "characterName" VARCHAR(80),
  "listingFormat" "SubcultureListingFormat",
  "subcultureMeta" JSONB,
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubcultureSaleRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubcultureSaleRecord_listingId_key"
  ON "SubcultureSaleRecord"("listingId");
CREATE INDEX IF NOT EXISTS "SubcultureSaleRecord_workTitle_productType_soldAt_idx"
  ON "SubcultureSaleRecord"("workTitle", "productType", "soldAt" DESC);
CREATE INDEX IF NOT EXISTS "SubcultureSaleRecord_animeSlug_productType_soldAt_idx"
  ON "SubcultureSaleRecord"("animeSlug", "productType", "soldAt" DESC);
CREATE INDEX IF NOT EXISTS "SubcultureSaleRecord_sellerId_soldAt_idx"
  ON "SubcultureSaleRecord"("sellerId", "soldAt" DESC);

ALTER TABLE "SubcultureSaleRecord"
  ADD CONSTRAINT "SubcultureSaleRecord_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
