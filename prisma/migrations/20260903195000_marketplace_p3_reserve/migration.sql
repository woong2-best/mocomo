-- P3: Stripe Connect rolling reserve fields on seller profile
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "stripeRollingReserveBps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "stripePayoutDelayDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "stripeReserveSyncedAt" TIMESTAMP(3);
