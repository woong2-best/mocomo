-- DM paid fan-art attachments
ALTER TABLE "MessageAttachment" ADD COLUMN IF NOT EXISTS "priceKrw" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MessageAttachment" ADD COLUMN IF NOT EXISTS "purchaseCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

CREATE TABLE IF NOT EXISTS "MessageAttachmentPurchase" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "attachmentId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachmentPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageAttachmentPurchase_buyerId_attachmentId_key"
  ON "MessageAttachmentPurchase"("buyerId", "attachmentId");
CREATE INDEX IF NOT EXISTS "MessageAttachmentPurchase_buyerId_createdAt_idx"
  ON "MessageAttachmentPurchase"("buyerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MessageAttachmentPurchase_attachmentId_idx"
  ON "MessageAttachmentPurchase"("attachmentId");

DO $$ BEGIN
  ALTER TABLE "MessageAttachmentPurchase"
    ADD CONSTRAINT "MessageAttachmentPurchase_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageAttachmentPurchase"
    ADD CONSTRAINT "MessageAttachmentPurchase_attachmentId_fkey"
    FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'MESSAGE_MEDIA';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
