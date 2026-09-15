-- AlterEnum: MOCO checkout burn ledger type
DO $$ BEGIN
  ALTER TYPE "MocoTransactionType" ADD VALUE 'CHECKOUT_BURN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
