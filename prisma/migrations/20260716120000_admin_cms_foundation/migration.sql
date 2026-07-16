-- Admin CMS: roles, settings, memos, lastLogin
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER_SUPPORT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SETTLEMENT_MANAGER';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminDisabledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteSetting_key_key" ON "SiteSetting"("key");
CREATE INDEX IF NOT EXISTS "SiteSetting_updatedAt_idx" ON "SiteSetting"("updatedAt");

CREATE TABLE IF NOT EXISTS "AdminUserMemo" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminUserMemo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminUserMemo_userId_createdAt_idx" ON "AdminUserMemo"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminUserMemo_authorId_idx" ON "AdminUserMemo"("authorId");

DO $$ BEGIN
  ALTER TABLE "AdminUserMemo" ADD CONSTRAINT "AdminUserMemo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AdminUserMemo" ADD CONSTRAINT "AdminUserMemo_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
