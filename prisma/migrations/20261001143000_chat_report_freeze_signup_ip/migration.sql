-- Chat room freeze + chat reports + signup IP audit

CREATE TYPE "ChatRoomStatus" AS ENUM ('ACTIVE', 'READ_ONLY');

ALTER TABLE "ChatRoom" ADD COLUMN "status" "ChatRoomStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TYPE "ReportTargetType" ADD VALUE 'CHAT_ROOM';

ALTER TABLE "Message" ADD COLUMN "isSystemMessage" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Report" ADD COLUMN "reporterIp" TEXT;
ALTER TABLE "Report" ADD COLUMN "reportedUserIp" TEXT;
ALTER TABLE "Report" ADD COLUMN "chatRoomId" TEXT;
ALTER TABLE "Report" ADD COLUMN "productId" TEXT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_chatRoomId_createdAt_idx" ON "Report"("chatRoomId", "createdAt");

ALTER TABLE "User" ADD COLUMN "signupIp" TEXT;
ALTER TABLE "User" ADD COLUMN "signupIpAt" TIMESTAMP(3);

CREATE TABLE "UserSignupIpLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSignupIpLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSignupIpLog_userId_createdAt_idx" ON "UserSignupIpLog"("userId", "createdAt");
CREATE INDEX "UserSignupIpLog_ip_createdAt_idx" ON "UserSignupIpLog"("ip", "createdAt");

ALTER TABLE "UserSignupIpLog" ADD CONSTRAINT "UserSignupIpLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
