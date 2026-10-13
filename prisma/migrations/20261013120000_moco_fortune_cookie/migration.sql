-- CreateTable
CREATE TABLE "MocoFortuneCookie" (
    "id" TEXT NOT NULL,
    "serialNo" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gemPurchaseId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "fortuneText" TEXT NOT NULL,
    "fortuneIndex" INTEGER NOT NULL,
    "theme" TEXT NOT NULL,
    "mocoQuantity" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MocoFortuneCookie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MocoFortuneCookie_serialNo_key" ON "MocoFortuneCookie"("serialNo");

-- CreateIndex
CREATE UNIQUE INDEX "MocoFortuneCookie_gemPurchaseId_key" ON "MocoFortuneCookie"("gemPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "MocoFortuneCookie_stripePaymentIntentId_key" ON "MocoFortuneCookie"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "MocoFortuneCookie_userId_createdAt_idx" ON "MocoFortuneCookie"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MocoFortuneCookie" ADD CONSTRAINT "MocoFortuneCookie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MocoFortuneCookie" ADD CONSTRAINT "MocoFortuneCookie_gemPurchaseId_fkey" FOREIGN KEY ("gemPurchaseId") REFERENCES "GemPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE IF EXISTS "MocoContributionTowerBlock";
