-- AlterEnum
ALTER TYPE "PaymentIntentType" ADD VALUE 'USED_AUCTION_BID_HOLD';

-- AlterTable
ALTER TABLE "UsedAuctionBid" ADD COLUMN "paymentIntentDbId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "holdAmount" INTEGER,
ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "UsedAuctionBid_paymentIntentDbId_key" ON "UsedAuctionBid"("paymentIntentDbId");

-- CreateIndex
CREATE INDEX "UsedAuctionBid_stripePaymentIntentId_idx" ON "UsedAuctionBid"("stripePaymentIntentId");
