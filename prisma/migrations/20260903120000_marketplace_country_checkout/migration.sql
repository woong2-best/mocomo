-- CreateEnum
CREATE TYPE "MarketplaceCheckoutMode" AS ENUM ('STRIPE', 'DIRECT_TRADE');

-- AlterEnum
ALTER TYPE "PaymentRail" ADD VALUE 'DIRECT';

-- AlterTable: MarketplaceSellerProfile (Vendor)
ALTER TABLE "MarketplaceSellerProfile"
  ADD COLUMN "isStripeSupported" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "directTradeBankName" TEXT,
  ADD COLUMN "directTradeAccountNumber" TEXT,
  ADD COLUMN "directTradeAccountHolder" TEXT,
  ADD COLUMN "directTradeContactPhone" TEXT;

-- Backfill: non-KR sellers default to Stripe-supported
UPDATE "MarketplaceSellerProfile"
SET "isStripeSupported" = true
WHERE UPPER("sellingMarket") <> 'KR';

-- AlterTable: MarketplaceOrder
ALTER TABLE "MarketplaceOrder"
  ADD COLUMN "checkoutMode" "MarketplaceCheckoutMode" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN "buyerCountryCode" TEXT,
  ADD COLUMN "directTradeSnapshot" JSONB,
  ADD COLUMN "buyerDirectPaidAt" TIMESTAMP(3);

CREATE INDEX "MarketplaceOrder_checkoutMode_status_idx"
  ON "MarketplaceOrder"("checkoutMode", "status");
