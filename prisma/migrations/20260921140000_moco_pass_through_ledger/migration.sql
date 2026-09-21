-- CreateEnum
CREATE TYPE "MocoTopupTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "MocoTopupTransaction" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "mocoQuantity" INTEGER NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "pgFeeCents" INTEGER NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "platformRevenueCents" INTEGER NOT NULL,
    "creatorAllocationCents" INTEGER NOT NULL,
    "status" "MocoTopupTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentIntentId" TEXT,
    "stripePaymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MocoTopupTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorBalance" (
    "creatorId" TEXT NOT NULL,
    "accumulatedAllocationCents" INTEGER NOT NULL DEFAULT 0,
    "withdrawnCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorBalance_pkey" PRIMARY KEY ("creatorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MocoTopupTransaction_paymentIntentId_key" ON "MocoTopupTransaction"("paymentIntentId");

-- CreateIndex
CREATE INDEX "MocoTopupTransaction_userId_createdAt_idx" ON "MocoTopupTransaction"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MocoTopupTransaction" ADD CONSTRAINT "MocoTopupTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBalance" ADD CONSTRAINT "CreatorBalance_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
