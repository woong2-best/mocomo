-- Marketplace trade legal record + dispute evidence snapshot
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "tradeLegalRecord" JSONB;
ALTER TABLE "MarketplaceDispute" ADD COLUMN IF NOT EXISTS "tradeEvidenceSnapshot" JSONB;

ALTER TYPE "MarketplaceDisputeReason" ADD VALUE IF NOT EXISTS 'SCAM_FRAUD_ACCOUNT';
