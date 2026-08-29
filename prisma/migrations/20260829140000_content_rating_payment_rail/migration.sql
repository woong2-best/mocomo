-- ContentRating enum + payment rail separation (General vs Adult)

CREATE TYPE "ContentRating" AS ENUM ('GENERAL', 'ADULT');
CREATE TYPE "PaymentRail" AS ENUM ('STRIPE', 'CCBILL');

ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "contentRating" "ContentRating" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "contentRating" "ContentRating" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "contentRating" "ContentRating" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "MarketplaceListing" ADD COLUMN IF NOT EXISTS "contentRating" "ContentRating" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "paymentRail" "PaymentRail" NOT NULL DEFAULT 'STRIPE';

UPDATE "Community" SET "contentRating" = 'ADULT' WHERE "isNsfw" = true;
UPDATE "Post" SET "contentRating" = 'ADULT' WHERE "isNsfw" = true;
UPDATE "UsedListing" SET "contentRating" = 'ADULT' WHERE "isNsfw" = true;
UPDATE "MarketplaceListing" SET "contentRating" = 'ADULT' WHERE "isNsfw" = true;

CREATE INDEX IF NOT EXISTS "PaymentIntent_paymentRail_status_idx" ON "PaymentIntent"("paymentRail", "status");
