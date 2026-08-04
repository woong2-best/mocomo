-- External embed live + MOCO_TOPUP (safe to re-run)
DO $$ BEGIN
  CREATE TYPE "LiveMediaSourceType" AS ENUM ('FIRST_PARTY', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LiveExternalProvider" AS ENUM ('YOUTUBE', 'TWITCH', 'CHZZK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "LiveBroadcastMode" ADD VALUE 'EXTERNAL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "PaymentIntentType" ADD VALUE 'MOCO_TOPUP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "VoiceChannel"
  ADD COLUMN IF NOT EXISTS "mediaSourceType" "LiveMediaSourceType" NOT NULL DEFAULT 'FIRST_PARTY',
  ADD COLUMN IF NOT EXISTS "externalProvider" "LiveExternalProvider",
  ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "externalWatchUrl" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "VoiceChannel_mediaSourceType_isLive_idx"
  ON "VoiceChannel" ("mediaSourceType", "isLive");
