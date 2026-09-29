-- CreateTable
CREATE TABLE "UsedListingStar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedListingStar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsedListingStar_userId_listingId_key" ON "UsedListingStar"("userId", "listingId");

-- CreateIndex
CREATE INDEX "UsedListingStar_userId_createdAt_idx" ON "UsedListingStar"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UsedListingStar" ADD CONSTRAINT "UsedListingStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsedListingStar" ADD CONSTRAINT "UsedListingStar_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
