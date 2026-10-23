-- CreateEnum
CREATE TYPE "CommentMediaType" AS ENUM ('PHOTO', 'GIF');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaType" "CommentMediaType";
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
