ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "recurringDonationTermsVersion" TEXT;
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "recurringDonationTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "PaymentIntent" ADD COLUMN IF NOT EXISTS "recurringDonationTermsSnapshot" TEXT;
