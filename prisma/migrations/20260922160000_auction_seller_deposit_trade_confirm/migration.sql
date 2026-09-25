-- CreateEnum
CREATE TYPE "AuctionDepositRole" AS ENUM ('BIDDER', 'SELLER');

-- AlterTable
ALTER TABLE "AuctionDeposit" ALTER COLUMN "bidId" DROP NOT NULL;
ALTER TABLE "AuctionDeposit" ADD COLUMN "role" "AuctionDepositRole" NOT NULL DEFAULT 'BIDDER';

-- AlterTable
ALTER TABLE "UsedListing" ADD COLUMN "sellerTradeConfirmedAt" TIMESTAMP(3),
ADD COLUMN "buyerTradeConfirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuctionDeposit_listingId_role_status_idx" ON "AuctionDeposit"("listingId", "role", "status");
