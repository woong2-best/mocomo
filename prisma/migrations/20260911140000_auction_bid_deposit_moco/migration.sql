-- CreateEnum
CREATE TYPE "AuctionDepositStatus" AS ENUM ('LOCKED', 'REFUNDED', 'FORFEITED');

-- AlterTable
ALTER TABLE "PlatformWallet" ADD COLUMN "lockedMocoBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AuctionDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "amountMoco" INTEGER NOT NULL,
    "status" "AuctionDepositStatus" NOT NULL DEFAULT 'LOCKED',
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" VARCHAR(120),

    CONSTRAINT "AuctionDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPenaltyRevenue" (
    "id" TEXT NOT NULL,
    "amountMoco" INTEGER NOT NULL,
    "usdValueCents" INTEGER NOT NULL,
    "sourceType" VARCHAR(40) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "listingId" TEXT,
    "forfeitingUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPenaltyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerHarmScore" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountMoco" INTEGER NOT NULL,
    "sourceType" VARCHAR(40) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "listingId" TEXT,
    "buyerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerHarmScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuctionDeposit_bidId_key" ON "AuctionDeposit"("bidId");

-- CreateIndex
CREATE INDEX "AuctionDeposit_userId_status_idx" ON "AuctionDeposit"("userId", "status");

-- CreateIndex
CREATE INDEX "AuctionDeposit_listingId_status_idx" ON "AuctionDeposit"("listingId", "status");

-- CreateIndex
CREATE INDEX "AuctionDeposit_listingId_userId_status_idx" ON "AuctionDeposit"("listingId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPenaltyRevenue_sourceId_key" ON "PlatformPenaltyRevenue"("sourceId");

-- CreateIndex
CREATE INDEX "PlatformPenaltyRevenue_sourceType_createdAt_idx" ON "PlatformPenaltyRevenue"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "SellerHarmScore_sellerId_createdAt_idx" ON "SellerHarmScore"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerHarmScore_sourceType_sourceId_sellerId_key" ON "SellerHarmScore"("sourceType", "sourceId", "sellerId");

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionDeposit" ADD CONSTRAINT "AuctionDeposit_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "UsedAuctionBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerHarmScore" ADD CONSTRAINT "SellerHarmScore_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
