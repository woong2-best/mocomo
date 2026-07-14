-- AlterTable MarketplaceListing
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "shipToCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MarketplaceListing" ALTER COLUMN "shipsWorldwide" SET DEFAULT false;

-- AlterTable MarketplaceShipment
ALTER TABLE "MarketplaceShipment" ADD COLUMN IF NOT EXISTS "carrierCode" TEXT;
ALTER TABLE "MarketplaceShipment" ADD COLUMN IF NOT EXISTS "externalTrackingId" TEXT;
CREATE INDEX IF NOT EXISTS "MarketplaceShipment_carrierCode_idx" ON "MarketplaceShipment"("carrierCode");
