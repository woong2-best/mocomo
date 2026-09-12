-- Burn + audit ledger: drop platform adRevenue, add MocoTransactionHistory

CREATE TYPE "MocoTransactionType" AS ENUM ('AD_PURCHASE', 'AUCTION_PENALTY');

CREATE TABLE "MocoTransactionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "MocoTransactionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MocoTransactionHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MocoTransactionHistory_type_referenceId_key" ON "MocoTransactionHistory"("type", "referenceId");
CREATE INDEX "MocoTransactionHistory_userId_createdAt_idx" ON "MocoTransactionHistory"("userId", "createdAt");
CREATE INDEX "MocoTransactionHistory_type_createdAt_idx" ON "MocoTransactionHistory"("type", "createdAt");

ALTER TABLE "MocoTransactionHistory" ADD CONSTRAINT "MocoTransactionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformWallet" DROP COLUMN IF EXISTS "adRevenue";
