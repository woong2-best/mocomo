ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settlementAccountHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_settlementAccountHash_key" ON "User"("settlementAccountHash");

CREATE TABLE IF NOT EXISTS "BankVerificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "bankCode" TEXT,
  "ipHash" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankVerificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BankVerificationLog_userId_createdAt_idx"
  ON "BankVerificationLog"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BankVerificationLog_action_createdAt_idx"
  ON "BankVerificationLog"("action", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "BankVerificationLog"
    ADD CONSTRAINT "BankVerificationLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
