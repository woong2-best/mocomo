-- AlterEnum
ALTER TYPE "ChatRoomType" ADD VALUE 'MARKET';

-- CreateEnum
CREATE TYPE "DirectTradePhase" AS ENUM (
  'SCHEDULED',
  'NO_SHOW_REPORTED',
  'DISPUTE_REVIEW',
  'NO_SHOW_CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'FORFEITED'
);

-- CreateEnum
CREATE TYPE "DirectArrivalStatus" AS ENUM (
  'ARRIVAL_PENDING',
  'ARRIVAL_VERIFIED',
  'ARRIVAL_GPS_FAILED',
  'ARRIVAL_PERMISSION_DENIED',
  'ARRIVAL_LOW_ACCURACY'
);

-- CreateTable
CREATE TABLE "UsedDirectTrade" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "meetAt" TIMESTAMP(3),
  "proposedMeetAt" TIMESTAMP(3),
  "proposedById" TEXT,
  "meetAdjustCount" INTEGER NOT NULL DEFAULT 0,
  "phase" "DirectTradePhase" NOT NULL DEFAULT 'SCHEDULED',
  "buyerArrival" "DirectArrivalStatus" NOT NULL DEFAULT 'ARRIVAL_PENDING',
  "sellerArrival" "DirectArrivalStatus" NOT NULL DEFAULT 'ARRIVAL_PENDING',
  "buyerArrivalAt" TIMESTAMP(3),
  "sellerArrivalAt" TIMESTAMP(3),
  "buyerDistanceBucket" VARCHAR(24),
  "sellerDistanceBucket" VARCHAR(24),
  "buyerAccuracyBucket" VARCHAR(24),
  "sellerAccuracyBucket" VARCHAR(24),
  "buyerGpsAttempts" INTEGER NOT NULL DEFAULT 0,
  "sellerGpsAttempts" INTEGER NOT NULL DEFAULT 0,
  "buyerRangeAttempts" INTEGER NOT NULL DEFAULT 0,
  "sellerRangeAttempts" INTEGER NOT NULL DEFAULT 0,
  "buyerLastVerifyAt" TIMESTAMP(3),
  "sellerLastVerifyAt" TIMESTAMP(3),
  "noShowReportedById" TEXT,
  "noShowUserId" TEXT,
  "noShowReportedAt" TIMESTAMP(3),
  "noShowResponseDueAt" TIMESTAMP(3),
  "buyerPinCipher" TEXT,
  "buyerPinHmac" VARCHAR(64),
  "pinAttempts" INTEGER NOT NULL DEFAULT 0,
  "pinsIssuedAt" TIMESTAMP(3),
  "pinsClearedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UsedDirectTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsedDirectTrade_listingId_key" ON "UsedDirectTrade"("listingId");
CREATE UNIQUE INDEX "UsedDirectTrade_roomId_key" ON "UsedDirectTrade"("roomId");
CREATE INDEX "UsedDirectTrade_buyerId_phase_idx" ON "UsedDirectTrade"("buyerId", "phase");
CREATE INDEX "UsedDirectTrade_sellerId_phase_idx" ON "UsedDirectTrade"("sellerId", "phase");
CREATE INDEX "UsedDirectTrade_phase_meetAt_idx" ON "UsedDirectTrade"("phase", "meetAt");
CREATE INDEX "UsedDirectTrade_phase_noShowResponseDueAt_idx" ON "UsedDirectTrade"("phase", "noShowResponseDueAt");

-- AddForeignKey
ALTER TABLE "UsedDirectTrade" ADD CONSTRAINT "UsedDirectTrade_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsedDirectTrade" ADD CONSTRAINT "UsedDirectTrade_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsedDirectTrade" ADD CONSTRAINT "UsedDirectTrade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsedDirectTrade" ADD CONSTRAINT "UsedDirectTrade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
