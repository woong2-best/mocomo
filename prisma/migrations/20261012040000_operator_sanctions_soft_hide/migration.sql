-- Soft-hide user content and unified operator sanction history.

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "removedById" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "removalReason" TEXT;

ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "removedById" TEXT;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "removalReason" TEXT;

ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "removedById" TEXT;
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "removalReason" TEXT;

CREATE INDEX IF NOT EXISTS "Post_removedAt_idx" ON "Post"("removedAt");
CREATE INDEX IF NOT EXISTS "UsedListing_removedAt_idx" ON "UsedListing"("removedAt");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_removedAt_idx" ON "MarketplaceListing"("removedAt");

DO $$ BEGIN
  ALTER TABLE "Post" ADD CONSTRAINT "Post_removedById_fkey"
    FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedListing" ADD CONSTRAINT "UsedListing_removedById_fkey"
    FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_removedById_fkey"
    FOREIGN KEY ("removedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AppealKind" AS ENUM ('ACCOUNT', 'CONTENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OperatorSanctionKind" AS ENUM (
    'CONTENT_REMOVE',
    'SUSPEND_24H',
    'SUSPEND_3D',
    'SUSPEND_5D',
    'SUSPEND_PERMANENT',
    'RESTORE_CONTENT',
    'LIFT_SUSPENSION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OperatorSanctionTargetType" AS ENUM (
    'POST',
    'USED_LISTING',
    'MARKETPLACE_LISTING',
    'ACCOUNT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OperatorSanction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "kind" "OperatorSanctionKind" NOT NULL,
  "targetType" "OperatorSanctionTargetType" NOT NULL,
  "targetId" TEXT,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "reversedById" TEXT,
  "noticeSeenAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperatorSanction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OperatorSanction_userId_createdAt_idx" ON "OperatorSanction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "OperatorSanction_targetType_targetId_idx" ON "OperatorSanction"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "OperatorSanction_userId_noticeSeenAt_idx" ON "OperatorSanction"("userId", "noticeSeenAt");

DO $$ BEGIN
  ALTER TABLE "OperatorSanction" ADD CONSTRAINT "OperatorSanction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OperatorSanction" ADD CONSTRAINT "OperatorSanction_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OperatorSanction" ADD CONSTRAINT "OperatorSanction_reversedById_fkey"
    FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AccountAppeal" ADD COLUMN IF NOT EXISTS "kind" "AppealKind" NOT NULL DEFAULT 'ACCOUNT';
ALTER TABLE "AccountAppeal" ADD COLUMN IF NOT EXISTS "targetType" TEXT;
ALTER TABLE "AccountAppeal" ADD COLUMN IF NOT EXISTS "targetId" TEXT;
ALTER TABLE "AccountAppeal" ADD COLUMN IF NOT EXISTS "sanctionId" TEXT;

CREATE INDEX IF NOT EXISTS "AccountAppeal_sanctionId_idx" ON "AccountAppeal"("sanctionId");

DO $$ BEGIN
  ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_sanctionId_fkey"
    FOREIGN KEY ("sanctionId") REFERENCES "OperatorSanction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
