-- Extend UserRole enum
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE 'VERIFIED'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE 'SENIOR_MODERATOR'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "UserRole" ADD VALUE 'OWNER'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "RiskScoreSource" AS ENUM ('SYSTEM', 'REPORT', 'AI', 'ADMIN', 'AUTO');

-- AlterTable User
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "riskScoreUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastRiskDecayAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "moderationReviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "moderationUrgentReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "sanctionPendingApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "priorSanctionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Report
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "moderationCaseId" TEXT;

-- CreateTable RiskScoreEvent
CREATE TABLE IF NOT EXISTS "RiskScoreEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" "RiskScoreSource" NOT NULL DEFAULT 'SYSTEM',
    "scoreAfter" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable ModerationCase
CREATE TABLE IF NOT EXISTS "ModerationCase" (
    "id" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "riskScoreSnapshot" INTEGER NOT NULL DEFAULT 0,
    "aiConfidence" DOUBLE PRECISION,
    "recommendedAction" TEXT,
    "recommendedReason" TEXT,
    "assignedAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable ModerationAiAnalysis
CREATE TABLE IF NOT EXISTS "ModerationAiAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT,
    "riskDelta" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "recommendedAction" TEXT,
    "recommendedReason" TEXT,
    "rawResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationAiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable StaffCreationLog
CREATE TABLE IF NOT EXISTS "StaffCreationLog" (
    "id" TEXT NOT NULL,
    "createdUserId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "reason" TEXT NOT NULL,
    "creatorIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffCreationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable ModerationAuditLog
CREATE TABLE IF NOT EXISTS "ModerationAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskScoreEvent_userId_createdAt_idx" ON "RiskScoreEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationCase_reportedUserId_status_idx" ON "ModerationCase"("reportedUserId", "status");
CREATE INDEX IF NOT EXISTS "ModerationCase_status_riskScoreSnapshot_idx" ON "ModerationCase"("status", "riskScoreSnapshot");
CREATE INDEX IF NOT EXISTS "ModerationAiAnalysis_userId_createdAt_idx" ON "ModerationAiAnalysis"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAiAnalysis_contentType_contentId_idx" ON "ModerationAiAnalysis"("contentType", "contentId");
CREATE INDEX IF NOT EXISTS "StaffCreationLog_createdUserId_idx" ON "StaffCreationLog"("createdUserId");
CREATE INDEX IF NOT EXISTS "StaffCreationLog_creatorId_createdAt_idx" ON "StaffCreationLog"("creatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAuditLog_adminId_createdAt_idx" ON "ModerationAuditLog"("adminId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAuditLog_targetUserId_createdAt_idx" ON "ModerationAuditLog"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAuditLog_action_createdAt_idx" ON "ModerationAuditLog"("action", "createdAt");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "RiskScoreEvent" ADD CONSTRAINT "RiskScoreEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "ModerationAiAnalysis" ADD CONSTRAINT "ModerationAiAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "StaffCreationLog" ADD CONSTRAINT "StaffCreationLog_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "StaffCreationLog" ADD CONSTRAINT "StaffCreationLog_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "Report" ADD CONSTRAINT "Report_moderationCaseId_fkey" FOREIGN KEY ("moderationCaseId") REFERENCES "ModerationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
