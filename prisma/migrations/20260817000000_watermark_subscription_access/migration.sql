-- Forensic sessions may now come from a subscription instead of a media purchase.
ALTER TABLE "WatermarkSession" ALTER COLUMN "purchaseId" DROP NOT NULL;

ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;

CREATE INDEX IF NOT EXISTS "WatermarkSession_subscriptionId_idx" ON "WatermarkSession"("subscriptionId");
