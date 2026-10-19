-- Creator reward payouts move off Stripe Connect onto a manual ledger.

CREATE TYPE "CreatorTaxFormType" AS ENUM ('W9', 'W8BEN');
CREATE TYPE "CreatorTaxReviewStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "CreatorPayoutDestinationKind" AS ENUM ('PAYONEER', 'WISE', 'BANK', 'UNSPECIFIED');
CREATE TYPE "CreatorPayoutRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
CREATE TYPE "CreatorPayoutRequestSource" AS ENUM ('ON_DEMAND', 'REWARD_BATCH', 'LEGACY_GIFT');

CREATE TABLE "CreatorTaxInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxFormType" "CreatorTaxFormType" NOT NULL,
    "tax_form_url" TEXT NOT NULL,
    "status" "CreatorTaxReviewStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorTaxInfo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorTaxInfo_userId_key" ON "CreatorTaxInfo"("userId");
CREATE INDEX "CreatorTaxInfo_status_createdAt_idx" ON "CreatorTaxInfo"("status", "createdAt");

CREATE TABLE "PayoutMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CreatorPayoutDestinationKind" NOT NULL,
    "destinationCipher" TEXT NOT NULL,
    "destinationKeyId" TEXT NOT NULL,
    "destinationHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayoutMethod_userId_key" ON "PayoutMethod"("userId");

CREATE TABLE "CreatorPayoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mocoAmount" INTEGER NOT NULL,
    "usdCents" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "CreatorPayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "tx_reference" TEXT,
    "adminNote" TEXT,
    "processedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "payoutMethodKind" "CreatorPayoutDestinationKind" NOT NULL,
    "payoutMethodHint" TEXT NOT NULL,
    "source" "CreatorPayoutRequestSource" NOT NULL DEFAULT 'ON_DEMAND',
    "rewardBatchId" TEXT,
    "giftBatchId" TEXT,
    "withdrawalId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorPayoutRequest_rewardBatchId_key" ON "CreatorPayoutRequest"("rewardBatchId");
CREATE UNIQUE INDEX "CreatorPayoutRequest_giftBatchId_key" ON "CreatorPayoutRequest"("giftBatchId");
CREATE UNIQUE INDEX "CreatorPayoutRequest_withdrawalId_key" ON "CreatorPayoutRequest"("withdrawalId");
CREATE UNIQUE INDEX "CreatorPayoutRequest_idempotencyKey_key" ON "CreatorPayoutRequest"("idempotencyKey");
CREATE INDEX "CreatorPayoutRequest_status_createdAt_idx" ON "CreatorPayoutRequest"("status", "createdAt");
CREATE INDEX "CreatorPayoutRequest_userId_status_createdAt_idx" ON "CreatorPayoutRequest"("userId", "status", "createdAt");

ALTER TABLE "CreatorTaxInfo" ADD CONSTRAINT "CreatorTaxInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorTaxInfo" ADD CONSTRAINT "CreatorTaxInfo_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayoutMethod" ADD CONSTRAINT "PayoutMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutRequest" ADD CONSTRAINT "CreatorPayoutRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutRequest" ADD CONSTRAINT "CreatorPayoutRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
