-- prisma-migrate-disable-transaction
-- Enum values must be committed before use in UPDATE (PostgreSQL 55P04).

ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'HUMOR';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'SPORTS';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'CREATOR';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'MUSIC';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'CREATIVE';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'SUBCULTURE';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'IT';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'FOOD';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'INFO';
ALTER TYPE "CommunityCategory" ADD VALUE IF NOT EXISTS 'CUSTOM';

ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "customCategoryLabel" TEXT;
