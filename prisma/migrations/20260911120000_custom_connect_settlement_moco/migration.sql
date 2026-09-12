-- Stripe Connect Custom + 정산 MOCO 이중 구조

ALTER TABLE "PlatformWallet" ADD COLUMN IF NOT EXISTS "settlementMocoPoints" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CreatorSettlementProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "bankCode" TEXT,
    "routingNumber" TEXT,
    "accountNumberLast4" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "stripeConnectAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3),
    "taxFormType" TEXT NOT NULL,
    "ssnLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSettlementProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorSettlementProfile_userId_key" ON "CreatorSettlementProfile"("userId");
CREATE INDEX IF NOT EXISTS "CreatorSettlementProfile_stripeConnectAccountId_idx" ON "CreatorSettlementProfile"("stripeConnectAccountId");

CREATE TABLE IF NOT EXISTS "CreatorTaxAttestation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeTosDate" INTEGER,

    CONSTRAINT "CreatorTaxAttestation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreatorTaxAttestation_userId_formType_idx" ON "CreatorTaxAttestation"("userId", "formType");
CREATE INDEX IF NOT EXISTS "CreatorTaxAttestation_acceptedAt_idx" ON "CreatorTaxAttestation"("acceptedAt");

CREATE TABLE IF NOT EXISTS "CreatorRewardPayoutBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "settlementMocoBefore" INTEGER NOT NULL,
    "grossAmountMinor" INTEGER NOT NULL,
    "withholdingMinor" INTEGER NOT NULL,
    "netAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorRewardPayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorRewardPayoutBatch_userId_periodYear_periodMonth_key"
    ON "CreatorRewardPayoutBatch"("userId", "periodYear", "periodMonth");
CREATE INDEX IF NOT EXISTS "CreatorRewardPayoutBatch_status_createdAt_idx"
    ON "CreatorRewardPayoutBatch"("status", "createdAt");

ALTER TABLE "CreatorSettlementProfile" ADD CONSTRAINT "CreatorSettlementProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorTaxAttestation" ADD CONSTRAINT "CreatorTaxAttestation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorRewardPayoutBatch" ADD CONSTRAINT "CreatorRewardPayoutBatch_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
