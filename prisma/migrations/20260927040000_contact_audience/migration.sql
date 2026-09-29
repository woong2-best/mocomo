-- CreateEnum
CREATE TYPE "ContactAudience" AS ENUM ('EVERYONE', 'FOLLOWING_ONLY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "messageRequestAudience" "ContactAudience" NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "User" ADD COLUMN "callRequestAudience" "ContactAudience" NOT NULL DEFAULT 'EVERYONE';
