CREATE TYPE "TermsConsentAction" AS ENUM ('CHECKOUT', 'TRANSFER');

-- Append-only consent log (checkout / transfer)
CREATE TABLE "terms_consent_log" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "termsVersion" TEXT NOT NULL,
  "actionType" "TermsConsentAction" NOT NULL,
  "acknowledgementText" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "terms_consent_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "terms_consent_log_userId_acceptedAt_idx" ON "terms_consent_log"("userId", "acceptedAt");

-- Append-only date-of-birth history (survives account deletion)
CREATE TABLE "birthdate_history" (
  "id" BIGSERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "oldValue" DATE,
  "newValue" DATE NOT NULL,
  "changedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "changedBy" TEXT NOT NULL,
  "reason" TEXT,
  "ipAddress" TEXT,
  "termsVersion" TEXT,

  CONSTRAINT "birthdate_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "birthdate_history_userId_changedAt_idx" ON "birthdate_history"("userId", "changedAt");

CREATE TABLE "birthdate_view_log" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "birthdate_view_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "birthdate_view_log_userId_viewedAt_idx" ON "birthdate_view_log"("userId", "viewedAt");

-- Block UPDATE/DELETE on append-only tables
CREATE OR REPLACE FUNCTION mocomo_forbid_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: UPDATE/DELETE is not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER terms_consent_log_no_update
  BEFORE UPDATE OR DELETE ON "terms_consent_log"
  FOR EACH ROW EXECUTE PROCEDURE mocomo_forbid_mutation();

CREATE TRIGGER birthdate_history_no_update
  BEFORE UPDATE OR DELETE ON "birthdate_history"
  FOR EACH ROW EXECUTE PROCEDURE mocomo_forbid_mutation();

-- Backfill first birth dates from existing users
INSERT INTO "birthdate_history" ("userId", "oldValue", "newValue", "changedAt", "changedBy", "reason", "termsVersion")
SELECT
  u.id,
  NULL,
  u."birthDate",
  COALESCE(u."birthDateCollectedAt", u."createdAt"),
  'user',
  'backfill',
  '2026-10-07'
FROM "User" u
WHERE u."birthDate" IS NOT NULL;
