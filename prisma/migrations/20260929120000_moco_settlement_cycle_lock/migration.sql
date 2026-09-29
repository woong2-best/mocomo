-- CreateEnum
CREATE TYPE "MocoSettlementCycleStatus" AS ENUM ('PROCESSING', 'PAID', 'FAILED', 'RETURNED');

-- CreateTable
CREATE TABLE "CreatorMocoSettlementCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "lockedMoco" INTEGER NOT NULL,
    "deductedMoco" INTEGER NOT NULL DEFAULT 0,
    "rolloverMoco" INTEGER NOT NULL DEFAULT 0,
    "status" "MocoSettlementCycleStatus" NOT NULL DEFAULT 'PROCESSING',
    "scheduledPayAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "rewardPayoutBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorMocoSettlementCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMocoSettlementCycle_rewardPayoutBatchId_key" ON "CreatorMocoSettlementCycle"("rewardPayoutBatchId");

-- CreateIndex
CREATE INDEX "CreatorMocoSettlementCycle_status_scheduledPayAt_idx" ON "CreatorMocoSettlementCycle"("status", "scheduledPayAt");

-- CreateIndex
CREATE INDEX "CreatorMocoSettlementCycle_periodYear_periodMonth_idx" ON "CreatorMocoSettlementCycle"("periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMocoSettlementCycle_userId_periodYear_periodMonth_key" ON "CreatorMocoSettlementCycle"("userId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "CreatorMocoSettlementCycle" ADD CONSTRAINT "CreatorMocoSettlementCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorMocoSettlementCycle" ADD CONSTRAINT "CreatorMocoSettlementCycle_rewardPayoutBatchId_fkey" FOREIGN KEY ("rewardPayoutBatchId") REFERENCES "CreatorRewardPayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
