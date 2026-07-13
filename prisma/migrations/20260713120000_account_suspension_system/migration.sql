-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LIMITED', 'READ_ONLY', 'TEMP_SUSPENDED', 'PERMANENT_SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('RECEIVED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT,
ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "suspendedById" TEXT,
ADD COLUMN IF NOT EXISTS "suspensionExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountSuspensionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "previousStatus" "AccountStatus" NOT NULL,
    "newStatus" "AccountStatus" NOT NULL,
    "reason" TEXT,
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountSuspensionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountAppeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountStatusAtSubmit" "AccountStatus" NOT NULL,
    "suspensionReasonSnapshot" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "allowFollowUpEmail" BOOLEAN NOT NULL DEFAULT true,
    "status" "AppealStatus" NOT NULL DEFAULT 'RECEIVED',
    "adminNotes" TEXT,
    "adminId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "infoRequestedAt" TIMESTAMP(3),
    "infoDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountAppealAttachment" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountAppealAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountAppealResponse" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountAppealResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BanEvasionSuspect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedUserId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "metadata" JSONB,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BanEvasionSuspect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountSuspensionLog_userId_createdAt_idx" ON "AccountSuspensionLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountAppeal_userId_createdAt_idx" ON "AccountAppeal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountAppeal_status_createdAt_idx" ON "AccountAppeal"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountAppealAttachment_appealId_idx" ON "AccountAppealAttachment"("appealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountAppealResponse_appealId_createdAt_idx" ON "AccountAppealResponse"("appealId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BanEvasionSuspect_userId_createdAt_idx" ON "BanEvasionSuspect"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BanEvasionSuspect_linkedUserId_idx" ON "BanEvasionSuspect"("linkedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BanEvasionSuspect_reviewed_createdAt_idx" ON "BanEvasionSuspect"("reviewed", "createdAt");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "AccountSuspensionLog" ADD CONSTRAINT "AccountSuspensionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "AccountSuspensionLog" ADD CONSTRAINT "AccountSuspensionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "AccountAppealAttachment" ADD CONSTRAINT "AccountAppealAttachment_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "AccountAppeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "AccountAppealResponse" ADD CONSTRAINT "AccountAppealResponse_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "AccountAppeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "BanEvasionSuspect" ADD CONSTRAINT "BanEvasionSuspect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "BanEvasionSuspect" ADD CONSTRAINT "BanEvasionSuspect_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
