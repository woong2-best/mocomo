-- CreateEnum
CREATE TYPE "WatermarkSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "WatermarkSession" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "opaqueWatermarkId" TEXT NOT NULL,
    "watermarkVersion" INTEGER NOT NULL,
    "sessionNonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "WatermarkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "detectionCount" INTEGER NOT NULL DEFAULT 0,
    "lastDetectedAt" TIMESTAMP(3),

    CONSTRAINT "WatermarkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatermarkDetectionLog" (
    "id" TEXT NOT NULL,
    "watermarkSessionId" TEXT,
    "contentId" TEXT,
    "detectionType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectedRegions" JSONB,
    "sourceFileHash" TEXT NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatermarkDetectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatermarkSession_opaqueWatermarkId_key" ON "WatermarkSession"("opaqueWatermarkId");

-- CreateIndex
CREATE INDEX "WatermarkSession_contentId_createdAt_idx" ON "WatermarkSession"("contentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatermarkSession_userId_createdAt_idx" ON "WatermarkSession"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatermarkSession_purchaseId_idx" ON "WatermarkSession"("purchaseId");

-- CreateIndex
CREATE INDEX "WatermarkSession_status_expiresAt_idx" ON "WatermarkSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "WatermarkSession_opaqueWatermarkId_idx" ON "WatermarkSession"("opaqueWatermarkId");

-- CreateIndex
CREATE INDEX "WatermarkDetectionLog_watermarkSessionId_createdAt_idx" ON "WatermarkDetectionLog"("watermarkSessionId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatermarkDetectionLog_contentId_createdAt_idx" ON "WatermarkDetectionLog"("contentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatermarkDetectionLog_sourceFileHash_idx" ON "WatermarkDetectionLog"("sourceFileHash");

-- CreateIndex
CREATE INDEX "WatermarkDetectionLog_resultStatus_createdAt_idx" ON "WatermarkDetectionLog"("resultStatus", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WatermarkDetectionLog_actorId_createdAt_idx" ON "WatermarkDetectionLog"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PostMediaPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatermarkDetectionLog" ADD CONSTRAINT "WatermarkDetectionLog_watermarkSessionId_fkey" FOREIGN KEY ("watermarkSessionId") REFERENCES "WatermarkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatermarkDetectionLog" ADD CONSTRAINT "WatermarkDetectionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
