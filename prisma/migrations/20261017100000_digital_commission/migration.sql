-- CreateTable
CREATE TABLE "DigitalCommission" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "purpose" VARCHAR(20) NOT NULL,
    "referenceUrls" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    "price" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'krw',
    "estimatedDays" INTEGER,
    "listingId" TEXT,
    "roomId" TEXT,
    "disputeReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigitalCommission_sellerId_status_idx" ON "DigitalCommission"("sellerId", "status");

-- CreateIndex
CREATE INDEX "DigitalCommission_buyerId_status_idx" ON "DigitalCommission"("buyerId", "status");

-- CreateIndex
CREATE INDEX "DigitalCommission_listingId_idx" ON "DigitalCommission"("listingId");

-- AddForeignKey
ALTER TABLE "DigitalCommission" ADD CONSTRAINT "DigitalCommission_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCommission" ADD CONSTRAINT "DigitalCommission_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCommission" ADD CONSTRAINT "DigitalCommission_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
