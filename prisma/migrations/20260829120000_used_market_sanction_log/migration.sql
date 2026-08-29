-- AlterTable
ALTER TABLE "UsedAuctionBid" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "UsedMarketSanctionReason" AS ENUM ('AUCTION_PAYMENT_TIMEOUT');

-- CreateTable
CREATE TABLE "UsedMarketSanctionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" "UsedMarketSanctionReason" NOT NULL,
    "reasonDetail" TEXT NOT NULL,
    "auctionEndsAt" TIMESTAMP(3),
    "paymentDueAt" TIMESTAMP(3),
    "sanctionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winningBidAmount" INTEGER,
    "userHighestBidAt" TIMESTAMP(3),
    "userHighestBidAmount" INTEGER,
    "bidTermsAcceptedAt" TIMESTAMP(3),
    "retainUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedMarketSanctionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsedMarketAppeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sanctionLogId" TEXT,
    "listingId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'RECEIVED',
    "adminNotes" TEXT,
    "adminId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedMarketAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsedMarketSanctionLog_userId_sanctionedAt_idx" ON "UsedMarketSanctionLog"("userId", "sanctionedAt" DESC);

-- CreateIndex
CREATE INDEX "UsedMarketSanctionLog_listingId_idx" ON "UsedMarketSanctionLog"("listingId");

-- CreateIndex
CREATE INDEX "UsedMarketSanctionLog_retainUntil_idx" ON "UsedMarketSanctionLog"("retainUntil");

-- CreateIndex
CREATE INDEX "UsedMarketAppeal_userId_createdAt_idx" ON "UsedMarketAppeal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsedMarketAppeal_status_createdAt_idx" ON "UsedMarketAppeal"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "UsedMarketSanctionLog" ADD CONSTRAINT "UsedMarketSanctionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedMarketSanctionLog" ADD CONSTRAINT "UsedMarketSanctionLog_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedMarketAppeal" ADD CONSTRAINT "UsedMarketAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedMarketAppeal" ADD CONSTRAINT "UsedMarketAppeal_sanctionLogId_fkey" FOREIGN KEY ("sanctionLogId") REFERENCES "UsedMarketSanctionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedMarketAppeal" ADD CONSTRAINT "UsedMarketAppeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedMarketAppeal" ADD CONSTRAINT "UsedMarketAppeal_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
