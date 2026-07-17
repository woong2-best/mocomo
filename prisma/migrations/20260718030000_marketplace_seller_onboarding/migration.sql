-- MoCoMo MARKET seller onboarding (WING-style)

CREATE TYPE "MarketplaceSellerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

CREATE TYPE "MarketplaceSellerKycStatus" AS ENUM (
  'NOT_STARTED',
  'PENDING',
  'VERIFIED',
  'FAILED',
  'DEFERRED'
);

CREATE TYPE "MarketplaceSellerOnboardingStep" AS ENUM (
  'ACCOUNT',
  'AGREEMENTS',
  'EMAIL',
  'PHONE',
  'SELLER_INFO',
  'KYC',
  'SETTLEMENT',
  'COMPLETE'
);

ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "sellerType" "MarketplaceSellerType",
  ADD COLUMN "sellingMarket" TEXT NOT NULL DEFAULT 'KR',
  ADD COLUMN "businessName" TEXT,
  ADD COLUMN "businessRegNo" TEXT,
  ADD COLUMN "onboardingStep" "MarketplaceSellerOnboardingStep" NOT NULL DEFAULT 'ACCOUNT',
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "agreedAgeAt" TIMESTAMP(3),
  ADD COLUMN "agreedTermsAt" TIMESTAMP(3),
  ADD COLUMN "agreedPrivacyAt" TIMESTAMP(3),
  ADD COLUMN "agreedMarketingAt" TIMESTAMP(3),
  ADD COLUMN "agreedPromoAt" TIMESTAMP(3),
  ADD COLUMN "kycStatus" "MarketplaceSellerKycStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "kycSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "kycNotes" TEXT,
  ADD COLUMN "phoneCountryCode" TEXT;

CREATE INDEX "MarketplaceSellerProfile_onboardingStep_status_idx"
  ON "MarketplaceSellerProfile"("onboardingStep", "status");

CREATE INDEX "MarketplaceSellerProfile_sellerType_status_idx"
  ON "MarketplaceSellerProfile"("sellerType", "status");

-- 기존 판매자: 온보딩 완료로 간주 (신규 WING 플로우와 구분)
UPDATE "MarketplaceSellerProfile"
SET
  "onboardingStep" = 'COMPLETE',
  "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", "createdAt"),
  "kycStatus" = CASE WHEN "kycStatus" = 'NOT_STARTED' THEN 'DEFERRED' ELSE "kycStatus" END
WHERE "status" IN ('APPROVED', 'PENDING', 'SUSPENDED');
