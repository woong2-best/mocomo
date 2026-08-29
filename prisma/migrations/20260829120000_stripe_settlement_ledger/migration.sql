-- Stripe-only settlement ledger: gross / platform fee / net payout / transfer id
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "grossAmount" INTEGER;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "platformFee" INTEGER;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "netPaidAmount" INTEGER;
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "stripeTransferId" TEXT;

CREATE INDEX IF NOT EXISTS "LedgerEntry_stripeTransferId_idx" ON "LedgerEntry"("stripeTransferId");
