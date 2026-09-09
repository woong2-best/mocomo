-- CreateEnum
CREATE TYPE "BirthDateSource" AS ENUM ('SIGNUP', 'OAUTH_COMPLETE', 'PROFILE_EDIT', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "feedRecommendationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "showLikeCounts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "birthDateSource" "BirthDateSource" NOT NULL DEFAULT 'SIGNUP';
ALTER TABLE "User" ADD COLUMN "birthDateCollectedAt" TIMESTAMP(3);

-- Backfill birthDateCollectedAt for existing users with birthDate
UPDATE "User"
SET "birthDateCollectedAt" = "createdAt"
WHERE "birthDate" IS NOT NULL AND "birthDateCollectedAt" IS NULL;
