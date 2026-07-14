-- AlterEnum
DO $$ BEGIN
 ALTER TYPE "PaymentIntentType" ADD VALUE 'MARKETPLACE';
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "MarketplaceDigitalDownload" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplaceDigitalDownload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceDigitalDownload_orderItemId_key" ON "MarketplaceDigitalDownload"("orderItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceDigitalDownload_downloadToken_key" ON "MarketplaceDigitalDownload"("downloadToken");
CREATE INDEX IF NOT EXISTS "MarketplaceDigitalDownload_buyerId_createdAt_idx" ON "MarketplaceDigitalDownload"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceDigitalDownload_orderId_idx" ON "MarketplaceDigitalDownload"("orderId");
CREATE INDEX IF NOT EXISTS "MarketplaceDigitalDownload_downloadToken_idx" ON "MarketplaceDigitalDownload"("downloadToken");
