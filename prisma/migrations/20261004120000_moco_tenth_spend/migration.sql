-- 0.1 MOCO for peer transfer and donations. Whole-MOCO columns stay the integer part.
ALTER TABLE "User" ADD COLUMN "gemBalanceTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GemPurchase" ADD COLUMN "remainingTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftEvent" ADD COLUMN "gemsTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftEventAllocation" ADD COLUMN "gemsUsedTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MocoDonation" ADD COLUMN "mocoAmountTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MocoTransactionHistory" ADD COLUMN "amountTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlatformWallet" ADD COLUMN "mocoPointsTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlatformWallet" ADD COLUMN "settlementMocoPointsTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlatformWalletLedger" ADD COLUMN "deltaTenths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlatformWalletLedger" ADD COLUMN "balanceAfterTenths" INTEGER NOT NULL DEFAULT 0;
