-- AlterTable
ALTER TABLE "DigitalCommission" ADD COLUMN "studioId" TEXT;
ALTER TABLE "DigitalCommission" ADD COLUMN "orderMeta" JSONB;

-- CreateTable
CREATE TABLE "CreatorStudio" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "open" BOOLEAN NOT NULL DEFAULT true,
    "slotCap" INTEGER NOT NULL DEFAULT 3,
    "deliveryDays" INTEGER NOT NULL DEFAULT 14,
    "revisionNote" TEXT NOT NULL DEFAULT '',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'krw',
    "portfolio" JSONB NOT NULL DEFAULT '[]',
    "tiers" JSONB NOT NULL DEFAULT '[]',
    "addons" JSONB NOT NULL DEFAULT '[]',
    "formFields" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorStudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioWaitlist" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorStudio_sellerId_key" ON "CreatorStudio"("sellerId");
CREATE INDEX "CreatorStudio_open_updatedAt_idx" ON "CreatorStudio"("open", "updatedAt");
CREATE UNIQUE INDEX "StudioWaitlist_studioId_userId_key" ON "StudioWaitlist"("studioId", "userId");
CREATE INDEX "StudioWaitlist_userId_idx" ON "StudioWaitlist"("userId");
CREATE INDEX "DigitalCommission_studioId_idx" ON "DigitalCommission"("studioId");

-- AddForeignKey
ALTER TABLE "CreatorStudio" ADD CONSTRAINT "CreatorStudio_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioWaitlist" ADD CONSTRAINT "StudioWaitlist_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "CreatorStudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioWaitlist" ADD CONSTRAINT "StudioWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalCommission" ADD CONSTRAINT "DigitalCommission_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "CreatorStudio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
