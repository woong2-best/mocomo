-- Twitter-style multi-account: park sessions per device without storing JWTs in the browser.

CREATE TABLE IF NOT EXISTS "DeviceParkedSession" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceParkedSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceParkedSession_deviceId_userId_key" ON "DeviceParkedSession"("deviceId", "userId");
CREATE INDEX IF NOT EXISTS "DeviceParkedSession_deviceId_lastUsedAt_idx" ON "DeviceParkedSession"("deviceId", "lastUsedAt");
CREATE INDEX IF NOT EXISTS "DeviceParkedSession_userId_idx" ON "DeviceParkedSession"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeviceParkedSession_userId_fkey'
  ) THEN
    ALTER TABLE "DeviceParkedSession"
      ADD CONSTRAINT "DeviceParkedSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
