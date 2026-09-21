-- Weekly broadcast schedule on StreamerProfile (calendar green days)

ALTER TABLE "StreamerProfile" ADD COLUMN IF NOT EXISTS "scheduleWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "StreamerProfile" ADD COLUMN IF NOT EXISTS "scheduleTime" VARCHAR(5);
