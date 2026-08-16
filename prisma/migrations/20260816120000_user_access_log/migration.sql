CREATE TABLE IF NOT EXISTS "UserAccessLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "username" TEXT,
  "email" TEXT,
  "ip" TEXT,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "userAgent" TEXT,
  "browser" TEXT,
  "os" TEXT,
  "device" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'web',
  "provider" TEXT,
  "platform" TEXT,
  "success" BOOLEAN NOT NULL,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserAccessLog_userId_createdAt_idx" ON "UserAccessLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserAccessLog_ip_createdAt_idx" ON "UserAccessLog"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "UserAccessLog_createdAt_idx" ON "UserAccessLog"("createdAt");
CREATE INDEX IF NOT EXISTS "UserAccessLog_success_createdAt_idx" ON "UserAccessLog"("success", "createdAt");

DO $$ BEGIN
  ALTER TABLE "UserAccessLog" ADD CONSTRAINT "UserAccessLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
