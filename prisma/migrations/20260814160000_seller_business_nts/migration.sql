-- AlterTable
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN "businessRepresentativeName" TEXT;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN "businessStartDate" TEXT;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN "businessVerifiedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN "businessStatusCode" TEXT;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN "businessTaxType" TEXT;
