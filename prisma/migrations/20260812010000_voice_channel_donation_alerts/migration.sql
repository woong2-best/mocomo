-- Broadcast-screen donation alerts toggle (default off)
ALTER TABLE "VoiceChannel"
  ADD COLUMN IF NOT EXISTS "donationAlertsOnStream" BOOLEAN NOT NULL DEFAULT false;
