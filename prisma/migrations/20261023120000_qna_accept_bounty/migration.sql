-- AlterEnum
ALTER TYPE "MocoTransactionType" ADD VALUE IF NOT EXISTS 'QNA_BOUNTY';
ALTER TYPE "MocoTransactionType" ADD VALUE IF NOT EXISTS 'QNA_BOUNTY_PAYOUT';
ALTER TYPE "MocoTransactionType" ADD VALUE IF NOT EXISTS 'QNA_BOUNTY_REFUND';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "qnaBountyCenti" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "acceptedCommentId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "qnaBountySettledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformWallet" ADD COLUMN IF NOT EXISTS "mocoPointsHundredths" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MocoTransactionHistory" ADD COLUMN IF NOT EXISTS "amountHundredths" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Post_acceptedCommentId_idx" ON "Post"("acceptedCommentId");
CREATE INDEX IF NOT EXISTS "Comment_postId_acceptedAt_idx" ON "Comment"("postId", "acceptedAt");
