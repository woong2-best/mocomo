-- Forensic sessions may target a creator episode as well as a PostMedia row.
-- Detection jobs store only the result; uploaded frames are never persisted.

ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "contentKind" TEXT NOT NULL DEFAULT 'POST_MEDIA';
ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "mediaId" TEXT;
ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "episodeId" TEXT;
ALTER TABLE "WatermarkSession" ADD COLUMN IF NOT EXISTS "episodePurchaseId" TEXT;

UPDATE "WatermarkSession"
SET "mediaId" = "contentId"
WHERE "mediaId" IS NULL AND ("contentKind" = 'POST_MEDIA' OR "contentKind" IS NULL);

ALTER TABLE "WatermarkSession" DROP CONSTRAINT IF EXISTS "WatermarkSession_contentId_fkey";

DO $$ BEGIN
  ALTER TABLE "WatermarkSession"
    ADD CONSTRAINT "WatermarkSession_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "PostMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WatermarkSession"
    ADD CONSTRAINT "WatermarkSession_episodeId_fkey"
    FOREIGN KEY ("episodeId") REFERENCES "CreatorEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WatermarkSession"
    ADD CONSTRAINT "WatermarkSession_episodePurchaseId_fkey"
    FOREIGN KEY ("episodePurchaseId") REFERENCES "CreatorEpisodePurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WatermarkSession_contentKind_contentId_idx" ON "WatermarkSession"("contentKind", "contentId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_mediaId_idx" ON "WatermarkSession"("mediaId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_episodeId_idx" ON "WatermarkSession"("episodeId");
CREATE INDEX IF NOT EXISTS "WatermarkSession_episodePurchaseId_idx" ON "WatermarkSession"("episodePurchaseId");

DO $$ BEGIN
  CREATE TYPE "WatermarkDetectionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WatermarkDetectionJob" (
  "id" TEXT NOT NULL,
  "status" "WatermarkDetectionJobStatus" NOT NULL DEFAULT 'PENDING',
  "actorId" TEXT NOT NULL,
  "contentId" TEXT,
  "sourceKind" TEXT NOT NULL,
  "sourceFileHash" TEXT,
  "clientFileHash" TEXT,
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WatermarkDetectionJob_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "WatermarkDetectionJob"
    ADD CONSTRAINT "WatermarkDetectionJob_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "WatermarkDetectionJob_actorId_createdAt_idx" ON "WatermarkDetectionJob"("actorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WatermarkDetectionJob_status_createdAt_idx" ON "WatermarkDetectionJob"("status", "createdAt" DESC);
