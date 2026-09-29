-- Purchased MOCO sent to another user is burned as PEER_TRANSFER.
-- The recipient is credited on settlement MOCO only (not held balance).
DO $$ BEGIN
  ALTER TYPE "MocoTransactionType" ADD VALUE 'PEER_TRANSFER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
