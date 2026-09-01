-- Stripe Connect 온보딩 상태 (웹훅 동기화)

CREATE TYPE "StripeConnectOnboardingStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'REQUIREMENTS_DUE',
  'DISABLED',
  'COMPLETE'
);

ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectRequirementsDue" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectDisabledReason" TEXT,
  ADD COLUMN "stripeConnectOnboardingStatus" "StripeConnectOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED';
