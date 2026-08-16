-- Idempotent watermark forensics schema (safe after partial db push / retry).

DO $$ BEGIN
    CREATE TYPE "WatermarkSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WatermarkSession" (
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

CREATE TABLE IF NOT EXISTS "WatermarkDetectionLog" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "WatermarkSession_opaqueWatermarkId_key" ON "WatermarkSession"("opaqueWatermarkId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_contentId_createdAt_idx" ON "WatermarkSession"("contentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkSession_userId_createdAt_idx" ON "WatermarkSession"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkSession_purchaseId_idx" ON "WatermarkSession"("purchaseId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_status_expiresAt_idx" ON "WatermarkSession"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "WatermarkSession_opaqueWatermarkId_idx" ON "WatermarkSession"("opaqueWatermarkId");
CREATE INDEX IF NOT EXISTS "WatermarkDetectionLog_watermarkSessionId_createdAt_idx" ON "WatermarkDetectionLog"("watermarkSessionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkDetectionLog_contentId_createdAt_idx" ON "WatermarkDetectionLog"("contentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkDetectionLog_sourceFileHash_idx" ON "WatermarkDetectionLog"("sourceFileHash");
CREATE INDEX IF NOT EXISTS "WatermarkDetectionLog_resultStatus_createdAt_idx" ON "WatermarkDetectionLog"("resultStatus", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkDetectionLog_actorId_createdAt_idx" ON "WatermarkDetectionLog"("actorId", "createdAt" DESC);

DO $$ BEGIN
    ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PostMediaPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "WatermarkSession" ADD CONSTRAINT "WatermarkSession_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "WatermarkDetectionLog" ADD CONSTRAINT "WatermarkDetectionLog_watermarkSessionId_fkey" FOREIGN KEY ("watermarkSessionId") REFERENCES "WatermarkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "WatermarkDetectionLog" ADD CONSTRAINT "WatermarkDetectionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
