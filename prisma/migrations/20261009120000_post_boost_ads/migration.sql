-- Post boost ads: 0.5 MOCO/day tenths + AD_REFUND ledger type
DO $$ BEGIN
  ALTER TYPE "MocoTransactionType" ADD VALUE 'AD_REFUND';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SponsoredAdCampaign" ADD COLUMN IF NOT EXISTS "mocoPaidTenths" INTEGER NOT NULL DEFAULT 0;
