-- Used listing bump + trade request flow (mobile 중고거래)
CREATE TYPE "UsedTradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "lastBumpedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "UsedTradeRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "UsedTradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "UsedTradeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsedTradeRequest_listingId_status_idx" ON "UsedTradeRequest"("listingId", "status");
CREATE INDEX IF NOT EXISTS "UsedTradeRequest_roomId_createdAt_idx" ON "UsedTradeRequest"("roomId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "UsedTradeRequest_buyerId_listingId_idx" ON "UsedTradeRequest"("buyerId", "listingId");

ALTER TABLE "UsedTradeRequest" ADD CONSTRAINT "UsedTradeRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsedTradeRequest" ADD CONSTRAINT "UsedTradeRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsedTradeRequest" ADD CONSTRAINT "UsedTradeRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
