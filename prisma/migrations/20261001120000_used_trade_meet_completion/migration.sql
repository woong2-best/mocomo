-- AlterTable
ALTER TABLE "UsedTradeRequest" ADD COLUMN IF NOT EXISTS "buyerMeetConfirmedAt" TIMESTAMP(3);
ALTER TABLE "UsedTradeRequest" ADD COLUMN IF NOT EXISTS "sellerMeetConfirmedAt" TIMESTAMP(3);
ALTER TABLE "UsedTradeRequest" ADD COLUMN IF NOT EXISTS "meetCompletionDeclinedAt" TIMESTAMP(3);
