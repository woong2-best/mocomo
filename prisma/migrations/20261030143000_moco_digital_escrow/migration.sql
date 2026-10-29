-- MOCO escrow for digital delivery.
-- available_moco mirrors spendable mocoPoints.
-- pending_moco is the seller hold until approval, auto-approval, or refund.
-- File bytes stay on Google Drive / Dropbox. Orders store the share URL and metadata only.

ALTER TYPE "MarketplaceCheckoutMode" ADD VALUE IF NOT EXISTS 'MOCO';

CREATE TYPE "MocoEscrowStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPUTED', 'REFUNDED');

ALTER TABLE "PlatformWallet"
  ADD COLUMN "available_moco" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "pending_moco" INTEGER NOT NULL DEFAULT 0;

UPDATE "PlatformWallet"
SET "available_moco" = "mocoPoints";

CREATE OR REPLACE FUNCTION sync_platform_wallet_available_moco()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.available_moco := NEW."mocoPoints";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_wallet_sync_available_moco ON "PlatformWallet";

CREATE TRIGGER platform_wallet_sync_available_moco
BEFORE INSERT OR UPDATE OF "mocoPoints" ON "PlatformWallet"
FOR EACH ROW
EXECUTE FUNCTION sync_platform_wallet_available_moco();

ALTER TABLE "MarketplaceOrder"
  ADD COLUMN "moco_escrow_status" "MocoEscrowStatus",
  ADD COLUMN "moco_amount" INTEGER,
  ADD COLUMN "cloud_share_url" TEXT,
  ADD COLUMN "cloud_share_secret" JSONB,
  ADD COLUMN "file_sha256" TEXT,
  ADD COLUMN "file_size_bytes" INTEGER,
  ADD COLUMN "file_mime_type" TEXT,
  ADD COLUMN "auto_approve_at" TIMESTAMP(3);

CREATE INDEX "MarketplaceOrder_mocoEscrowStatus_autoApproveAt_idx"
  ON "MarketplaceOrder" ("moco_escrow_status", "auto_approve_at");
