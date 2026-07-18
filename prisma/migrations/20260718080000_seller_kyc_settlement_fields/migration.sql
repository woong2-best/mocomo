-- Seller KYC + settlement declaration fields for global onboarding policy

ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "kycIdType" TEXT,
  ADD COLUMN "kycLegalName" TEXT,
  ADD COLUMN "kycIdHint" TEXT,
  ADD COLUMN "settlementDeclaredAt" TIMESTAMP(3);
