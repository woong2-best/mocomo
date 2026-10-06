-- Birth date change history for dispute review.
CREATE TABLE "BirthDateChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousValue" DATE,
    "newValue" DATE,
    "source" "BirthDateSource" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BirthDateChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BirthDateChangeLog_userId_createdAt_idx" ON "BirthDateChangeLog"("userId", "createdAt");

ALTER TABLE "BirthDateChangeLog" ADD CONSTRAINT "BirthDateChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BirthDateChangeLog" ADD CONSTRAINT "BirthDateChangeLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing members: one initial row (previous empty) at first-known collection time.
INSERT INTO "BirthDateChangeLog" ("id", "userId", "previousValue", "newValue", "source", "createdAt")
SELECT
  md5('birth-date-seed:' || u."id"),
  u."id",
  NULL,
  u."birthDate",
  u."birthDateSource",
  COALESCE(u."birthDateCollectedAt", u."createdAt")
FROM "User" u
WHERE u."birthDate" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "BirthDateChangeLog" l WHERE l."userId" = u."id"
  );
