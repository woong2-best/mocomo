-- CreateEnum
CREATE TYPE "CreatorBulkDmJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CreatorDmMarketing" (
    "userId" TEXT NOT NULL,
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeText" TEXT,
    "welcomeMediaUrl" TEXT,
    "welcomeMediaType" "MessageAttachmentType",
    "welcomeMediaName" TEXT,
    "welcomeMediaPriceKrw" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorDmMarketing_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CreatorBulkDmJob" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "MessageAttachmentType",
    "mediaName" TEXT,
    "mediaPriceKrw" INTEGER NOT NULL DEFAULT 0,
    "status" "CreatorBulkDmJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalFollowers" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "cursorFollowerId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorBulkDmJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorBulkDmJob_creatorId_createdAt_idx" ON "CreatorBulkDmJob"("creatorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CreatorBulkDmJob_status_createdAt_idx" ON "CreatorBulkDmJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CreatorDmMarketing" ADD CONSTRAINT "CreatorDmMarketing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBulkDmJob" ADD CONSTRAINT "CreatorBulkDmJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
