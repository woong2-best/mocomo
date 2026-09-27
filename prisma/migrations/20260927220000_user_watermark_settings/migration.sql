-- AlterTable
ALTER TABLE "User" ADD COLUMN "watermarkInsertEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "watermarkPlacement" TEXT;
