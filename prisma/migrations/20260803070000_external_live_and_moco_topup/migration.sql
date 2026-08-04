-- External embed live channels + MOCO top-up payment type
-- Preserves all first-party live columns (no drops).

CREATE TYPE "LiveMediaSourceType" AS ENUM ('FIRST_PARTY', 'EXTERNAL');
CREATE TYPE "LiveExternalProvider" AS ENUM ('YOUTUBE', 'TWITCH', 'CHZZK');

ALTER TYPE "LiveBroadcastMode" ADD VALUE IF NOT EXISTS 'EXTERNAL';
ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'MOCO_TOPUP';

ALTER TABLE "VoiceChannel"
  ADD COLUMN IF NOT EXISTS "mediaSourceType" "LiveMediaSourceType" NOT NULL DEFAULT 'FIRST_PARTY',
  ADD COLUMN IF NOT EXISTS "externalProvider" "LiveExternalProvider",
  ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "externalWatchUrl" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "VoiceChannel_mediaSourceType_isLive_idx"
  ON "VoiceChannel" ("mediaSourceType", "isLive");
