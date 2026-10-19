-- Interactive W-9 / W-8BEN forms expire, and a payout-country change can invalidate them.

ALTER TYPE "CreatorTaxReviewStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "CreatorTaxInfo" ADD COLUMN IF NOT EXISTS "countryCode" VARCHAR(2);
ALTER TABLE "CreatorTaxInfo" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

ALTER TABLE "PayoutMethod" ADD COLUMN IF NOT EXISTS "countryCode" VARCHAR(2);
