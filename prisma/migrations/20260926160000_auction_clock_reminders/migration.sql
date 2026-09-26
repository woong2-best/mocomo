-- AlterTable
ALTER TABLE "UsedListing" ADD COLUMN "auctionReminder1dSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "auctionReminder1hSent" BOOLEAN NOT NULL DEFAULT false;
