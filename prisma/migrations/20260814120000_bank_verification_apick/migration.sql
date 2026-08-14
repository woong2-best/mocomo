-- Apick 1원 계좌 인증 필드
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settlementBankCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settlementAccountLast4" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settlementAccountHolder" TEXT;

CREATE INDEX IF NOT EXISTS "User_settlementBankCode_settlementAccountLast4_idx"
  ON "User"("settlementBankCode", "settlementAccountLast4");
