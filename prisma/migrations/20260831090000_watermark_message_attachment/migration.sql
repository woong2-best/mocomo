-- Forensic watermark sessions for paid DM (messenger) photo/video attachments
ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "messageAttachmentId" TEXT;
ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "messageAttachmentPurchaseId" TEXT;

CREATE INDEX IF NOT EXISTS "WatermarkSession_messageAttachmentId_idx"
  ON "WatermarkSession"("messageAttachmentId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_messageAttachmentPurchaseId_idx"
  ON "WatermarkSession"("messageAttachmentPurchaseId");

DO $$ BEGIN
  ALTER TABLE "WatermarkSession"
    ADD CONSTRAINT "WatermarkSession_messageAttachmentId_fkey"
    FOREIGN KEY ("messageAttachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WatermarkSession"
    ADD CONSTRAINT "WatermarkSession_messageAttachmentPurchaseId_fkey"
    FOREIGN KEY ("messageAttachmentPurchaseId") REFERENCES "MessageAttachmentPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
