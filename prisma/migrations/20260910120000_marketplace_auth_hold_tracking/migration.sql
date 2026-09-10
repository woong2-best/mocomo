-- Track card auth hold expiry + payment settlement block timestamp on marketplace orders
ALTER TABLE "MarketplaceOrder" ADD COLUMN "authHoldExpiresAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceOrder" ADD COLUMN "settlementBlockedAt" TIMESTAMP(3);

CREATE INDEX "MarketplaceOrder_authHoldExpiresAt_idx" ON "MarketplaceOrder"("authHoldExpiresAt");
