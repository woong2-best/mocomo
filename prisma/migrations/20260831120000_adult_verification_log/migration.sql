-- PortOne 본인인증 감사 로그 (성인인증 게이트)
CREATE TYPE "AdultVerificationProvider" AS ENUM ('PORTONE', 'LEGACY_SELF_REPORT');
CREATE TYPE "AdultVerificationScope" AS ENUM ('DM_PAID', 'USED_MARKET', 'GLOBAL');

CREATE TABLE "adult_verification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AdultVerificationProvider" NOT NULL DEFAULT 'PORTONE',
    "scope" "AdultVerificationScope" NOT NULL DEFAULT 'GLOBAL',
    "portoneVerificationId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "birthDate" DATE NOT NULL,
    "ipHash" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adult_verification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "adult_verification_logs_portoneVerificationId_key"
  ON "adult_verification_logs"("portoneVerificationId");

CREATE INDEX "adult_verification_logs_userId_verifiedAt_idx"
  ON "adult_verification_logs"("userId", "verifiedAt" DESC);

ALTER TABLE "adult_verification_logs"
  ADD CONSTRAINT "adult_verification_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
