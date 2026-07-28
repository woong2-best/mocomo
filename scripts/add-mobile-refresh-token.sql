-- Mobile Bearer refresh tokens (Phase 1)
-- Safe additive: does not drop User.level / User.xp or other columns.

CREATE TABLE IF NOT EXISTS "MobileRefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "deviceId" TEXT,
  "platform" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "MobileRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MobileRefreshToken_tokenHash_key"
  ON "MobileRefreshToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "MobileRefreshToken_userId_idx"
  ON "MobileRefreshToken"("userId");

CREATE INDEX IF NOT EXISTS "MobileRefreshToken_expiresAt_idx"
  ON "MobileRefreshToken"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MobileRefreshToken_userId_fkey'
  ) THEN
    ALTER TABLE "MobileRefreshToken"
      ADD CONSTRAINT "MobileRefreshToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
