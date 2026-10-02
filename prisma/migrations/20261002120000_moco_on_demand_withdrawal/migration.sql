CREATE TABLE "CreatorMocoOnDemandWithdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawMoco" INTEGER NOT NULL,
    "balanceBeforeMoco" INTEGER NOT NULL,
    "balanceAfterMoco" INTEGER NOT NULL,
    "activeTierBefore" TEXT NOT NULL,
    "activeTierAfter" TEXT NOT NULL,
    "payoutTier" TEXT NOT NULL,
    "faceValueCents" INTEGER NOT NULL,
    "platformMarginCents" INTEGER NOT NULL,
    "netTransferCents" INTEGER NOT NULL,
    "grossAmountMinor" INTEGER NOT NULL,
    "withholdingMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorMocoOnDemandWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreatorMocoOnDemandWithdrawal_userId_createdAt_idx" ON "CreatorMocoOnDemandWithdrawal"("userId", "createdAt");
CREATE INDEX "CreatorMocoOnDemandWithdrawal_status_createdAt_idx" ON "CreatorMocoOnDemandWithdrawal"("status", "createdAt");
CREATE INDEX "CreatorMocoOnDemandWithdrawal_stripeTransferId_idx" ON "CreatorMocoOnDemandWithdrawal"("stripeTransferId");

ALTER TABLE "CreatorMocoOnDemandWithdrawal" ADD CONSTRAINT "CreatorMocoOnDemandWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
