-- Drop unused account level / XP gamification columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "level";
ALTER TABLE "User" DROP COLUMN IF EXISTS "xp";
