-- AlterEnum
ALTER TYPE "MocoSettlementCycleStatus" ADD VALUE 'DEPRECATED_ON_DEMAND_ACTIVE';

ALTER TABLE "CreatorMocoOnDemandWithdrawal" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "CreatorMocoOnDemandWithdrawal_idempotencyKey_key" ON "CreatorMocoOnDemandWithdrawal"("idempotencyKey");

CREATE TABLE "ApiIdempotencyKey" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiIdempotencyKey_scope_idempotencyKey_key" ON "ApiIdempotencyKey"("scope", "idempotencyKey");
CREATE INDEX "ApiIdempotencyKey_expiresAt_idx" ON "ApiIdempotencyKey"("expiresAt");
CREATE INDEX "ApiIdempotencyKey_userId_createdAt_idx" ON "ApiIdempotencyKey"("userId", "createdAt");
