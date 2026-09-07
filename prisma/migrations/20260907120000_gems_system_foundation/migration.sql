-- Gems system foundation (v2.0 spec)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gemBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterEnum
ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'GEM_TOPUP';

CREATE TABLE IF NOT EXISTS "GemPurchase" (
  "id" TEXT NOT NULL,
  "fanId" TEXT NOT NULL,
  "krwAmount" INTEGER NOT NULL,
  "gems" INTEGER NOT NULL,
  "remainingGems" INTEGER NOT NULL,
  "pricePerGemUsd" DOUBLE PRECISION NOT NULL,
  "stripePaymentIntentId" TEXT NOT NULL,
  "refunded" BOOLEAN NOT NULL DEFAULT false,
  "refundedUsd" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GemPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GemPurchase_stripePaymentIntentId_key" ON "GemPurchase"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "GemPurchase_fanId_createdAt_idx" ON "GemPurchase"("fanId", "createdAt");
CREATE INDEX IF NOT EXISTS "GemPurchase_fanId_remainingGems_idx" ON "GemPurchase"("fanId", "remainingGems");

CREATE TABLE IF NOT EXISTS "CreatorPayoutBatch" (
  "id" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "giftEventCount" INTEGER NOT NULL,
  "totalGems" INTEGER NOT NULL,
  "totalUsd" DOUBLE PRECISION NOT NULL,
  "netPayoutUsd" DOUBLE PRECISION NOT NULL,
  "rateVersion" TEXT NOT NULL,
  "payoutMethod" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "stripeTransferId" TEXT,
  "stripePayoutId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorPayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreatorPayoutBatch_creatorId_createdAt_idx" ON "CreatorPayoutBatch"("creatorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CreatorPayoutBatch_status_createdAt_idx" ON "CreatorPayoutBatch"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "GiftEvent" (
  "id" TEXT NOT NULL,
  "fanId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "gems" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "contentId" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payoutBatchId" TEXT,
  CONSTRAINT "GiftEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GiftEvent_creatorId_payoutBatchId_idx" ON "GiftEvent"("creatorId", "payoutBatchId");
CREATE INDEX IF NOT EXISTS "GiftEvent_fanId_timestamp_idx" ON "GiftEvent"("fanId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "GiftEvent_payoutBatchId_idx" ON "GiftEvent"("payoutBatchId");

CREATE TABLE IF NOT EXISTS "GiftEventAllocation" (
  "id" TEXT NOT NULL,
  "giftEventId" TEXT NOT NULL,
  "gemPurchaseId" TEXT NOT NULL,
  "gemsUsed" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftEventAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GiftEventAllocation_gemPurchaseId_idx" ON "GiftEventAllocation"("gemPurchaseId");
CREATE INDEX IF NOT EXISTS "GiftEventAllocation_giftEventId_idx" ON "GiftEventAllocation"("giftEventId");

CREATE TABLE IF NOT EXISTS "UnauthorizedPaymentClaim" (
  "id" TEXT NOT NULL,
  "gemPurchaseId" TEXT NOT NULL,
  "fanId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "proofUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnauthorizedPaymentClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UnauthorizedPaymentClaim_fanId_createdAt_idx" ON "UnauthorizedPaymentClaim"("fanId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "UnauthorizedPaymentClaim_gemPurchaseId_idx" ON "UnauthorizedPaymentClaim"("gemPurchaseId");
CREATE INDEX IF NOT EXISTS "UnauthorizedPaymentClaim_status_idx" ON "UnauthorizedPaymentClaim"("status");

DO $$ BEGIN
  ALTER TABLE "GemPurchase" ADD CONSTRAINT "GemPurchase_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftEvent" ADD CONSTRAINT "GiftEvent_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "CreatorPayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftEventAllocation" ADD CONSTRAINT "GiftEventAllocation_giftEventId_fkey" FOREIGN KEY ("giftEventId") REFERENCES "GiftEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftEventAllocation" ADD CONSTRAINT "GiftEventAllocation_gemPurchaseId_fkey" FOREIGN KEY ("gemPurchaseId") REFERENCES "GemPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CreatorPayoutBatch" ADD CONSTRAINT "CreatorPayoutBatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UnauthorizedPaymentClaim" ADD CONSTRAINT "UnauthorizedPaymentClaim_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
