-- AlterEnum
ALTER TYPE "PaymentIntentType" ADD VALUE 'VENDOR_ONBOARDING_FEE';

-- AlterTable
ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "vendorOnboardingFeePaidAt" TIMESTAMP(3),
  ADD COLUMN "vendorOnboardingFeeAmount" INTEGER;
