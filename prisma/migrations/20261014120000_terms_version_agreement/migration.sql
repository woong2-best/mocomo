-- Terms of Service version registry + per-user agreement history.
ALTER TABLE "User" ADD COLUMN "current_terms_version" TEXT;

CREATE TABLE "Terms_Version" (
    "id" TEXT NOT NULL,
    "version_tag" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "terms_url" TEXT NOT NULL,

    CONSTRAINT "Terms_Version_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Terms_Version_version_tag_key" ON "Terms_Version"("version_tag");
CREATE INDEX "Terms_Version_effective_date_idx" ON "Terms_Version"("effective_date");

CREATE TABLE "Terms_Agreement_History" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_ip" TEXT,

    CONSTRAINT "Terms_Agreement_History_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Terms_Agreement_History_user_id_agreed_at_idx" ON "Terms_Agreement_History"("user_id", "agreed_at");
CREATE INDEX "Terms_Agreement_History_terms_version_idx" ON "Terms_Agreement_History"("terms_version");

ALTER TABLE "Terms_Agreement_History"
  ADD CONSTRAINT "Terms_Agreement_History_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Terms_Version" ("id", "version_tag", "effective_date", "terms_url")
VALUES
  ('terms_v1_0', 'v1.0', '2026-10-13T00:00:00.000Z', '/legal/terms'),
  ('terms_v2_0', 'v2.0', '2026-11-15T00:00:00.000Z', '/legal/terms#changed-part');

-- Existing accounts already agreed at signup to the then-current terms.
UPDATE "User" SET "current_terms_version" = 'v1.0' WHERE "current_terms_version" IS NULL;
