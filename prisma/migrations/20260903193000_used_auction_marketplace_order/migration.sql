-- Used auction win → MarketplaceOrder bridge (P2.5)

ALTER TABLE "MarketplaceOrder" ADD COLUMN "usedListingId" TEXT;
ALTER TABLE "MarketplaceOrderItem" ALTER COLUMN "listingId" DROP NOT NULL;
ALTER TABLE "MarketplaceOrderItem" ADD COLUMN "usedListingId" TEXT;

ALTER TABLE "UsedListing" ADD COLUMN "marketplaceOrderId" TEXT;

CREATE UNIQUE INDEX "MarketplaceOrder_usedListingId_key" ON "MarketplaceOrder"("usedListingId");
CREATE UNIQUE INDEX "UsedListing_marketplaceOrderId_key" ON "UsedListing"("marketplaceOrderId");

ALTER TABLE "MarketplaceOrder"
  ADD CONSTRAINT "MarketplaceOrder_usedListingId_fkey"
  FOREIGN KEY ("usedListingId") REFERENCES "UsedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketplaceOrderItem"
  ADD CONSTRAINT "MarketplaceOrderItem_usedListingId_fkey"
  FOREIGN KEY ("usedListingId") REFERENCES "UsedListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "MarketplaceOrder_usedListingId_idx" ON "MarketplaceOrder"("usedListingId");
CREATE INDEX "MarketplaceOrderItem_usedListingId_idx" ON "MarketplaceOrderItem"("usedListingId");
