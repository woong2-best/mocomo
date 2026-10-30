-- CreateEnum
CREATE TYPE "MentionAudience" AS ENUM ('EVERYONE', 'FOLLOWING_ONLY', 'NOBODY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mentionAudience" "MentionAudience" NOT NULL DEFAULT 'EVERYONE';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "mentionedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Post" ADD COLUMN "mentionStates" JSONB;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "mentionedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Comment" ADD COLUMN "mentionStates" JSONB;

-- CreateIndex
CREATE INDEX "UsernameChangeLog_oldUsername_idx" ON "UsernameChangeLog"("oldUsername");
