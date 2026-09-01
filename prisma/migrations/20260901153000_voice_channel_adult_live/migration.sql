-- AlterEnum
ALTER TYPE "AdultVerificationScope" ADD VALUE 'LIVE';

-- AlterTable
ALTER TABLE "VoiceChannel" ADD COLUMN "contentRating" "ContentRating" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "VoiceChannel" ADD COLUMN "isNsfw" BOOLEAN NOT NULL DEFAULT false;
