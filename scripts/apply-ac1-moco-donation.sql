-- Idempotent fix for failed 20260921120000 + follow-on MOCO donation migrations.
-- Run in Supabase SQL Editor (postgres role) OR: npx prisma db execute --file scripts/apply-ac1-moco-donation.sql

DO $$ BEGIN
  CREATE TYPE "MocoDonationType" AS ENUM ('VIDEO', 'TTS', 'CHAT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MocoDonationStatus" AS ENUM ('PENDING', 'PLAYING', 'COMPLETED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "MocoDonationType" ADD VALUE IF NOT EXISTS 'SFX';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MocoDonation" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "streamerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mocoAmount" INTEGER NOT NULL,
  "type" "MocoDonationType" NOT NULL,
  "mediaUrl" TEXT,
  "message" TEXT,
  "ttsVoice" TEXT,
  "maxPlaySec" INTEGER NOT NULL DEFAULT 60,
  "status" "MocoDonationStatus" NOT NULL DEFAULT 'PENDING',
  "giftEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "playedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MocoDonation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "videoDonationRateMocoPerSec" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "videoDonationMinMoco" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "videoDonationBlocklistJson" JSONB;

ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "sfxKey" TEXT;
ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "videoTitle" TEXT;
ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "startSec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "endSec" INTEGER;
ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "playToEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MocoDonation" ADD COLUMN IF NOT EXISTS "segmentPlaySec" INTEGER;

ALTER TABLE "VoiceChannel" ALTER COLUMN "videoDonationMinMoco" SET DEFAULT 2;

CREATE INDEX IF NOT EXISTS "MocoDonation_channelId_status_createdAt_idx"
  ON "MocoDonation"("channelId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "MocoDonation_streamerId_createdAt_idx"
  ON "MocoDonation"("streamerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MocoDonation_userId_createdAt_idx"
  ON "MocoDonation"("userId", "createdAt" DESC);
