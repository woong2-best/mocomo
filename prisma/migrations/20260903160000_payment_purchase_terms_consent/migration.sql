-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN "purchaseTermsVersion" TEXT,
ADD COLUMN "purchaseTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "purchaseTermsSnapshot" TEXT,
ADD COLUMN "purchaseTermsPlatform" TEXT;

-- AlterTable
ALTER TABLE "MarketplaceOrder" ADD COLUMN "purchaseTermsVersion" TEXT,
ADD COLUMN "purchaseTermsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "purchaseTermsSnapshot" TEXT,
ADD COLUMN "purchaseTermsPlatform" TEXT;

-- CreateIndex
CREATE INDEX "PaymentIntent_purchaseTermsAcceptedAt_idx" ON "PaymentIntent"("purchaseTermsAcceptedAt");
