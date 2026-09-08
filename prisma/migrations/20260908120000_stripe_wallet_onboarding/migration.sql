-- Stripe Connect wallet onboarding flag (replaces Apick 1-won bank verify for payouts)
ALTER TABLE "User" ADD COLUMN "stripeOnboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "stripeOnboardingCompleted" = true
WHERE "stripeConnectOnboardedAt" IS NOT NULL;
