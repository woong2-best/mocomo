-- 중고거래 통화 (krw | usd). 기존 글은 USD 센트로 저장된 값이 많아 usd로 마킹.
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'usd';
UPDATE "UsedListing" SET "currency" = 'usd' WHERE "currency" IS NULL OR "currency" = '';
ALTER TABLE "UsedListing" ALTER COLUMN "currency" SET DEFAULT 'krw';
