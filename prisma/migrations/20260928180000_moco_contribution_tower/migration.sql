-- CreateTable
CREATE TABLE "MocoContributionTowerBlock" (
    "id" TEXT NOT NULL,
    "stackOrder" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "gemPurchaseId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "mocoQuantity" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "profileImageUrl" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MocoContributionTowerBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MocoContributionTowerBlock_stackOrder_key" ON "MocoContributionTowerBlock"("stackOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MocoContributionTowerBlock_gemPurchaseId_key" ON "MocoContributionTowerBlock"("gemPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "MocoContributionTowerBlock_stripePaymentIntentId_key" ON "MocoContributionTowerBlock"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "MocoContributionTowerBlock_visible_stackOrder_idx" ON "MocoContributionTowerBlock"("visible", "stackOrder");

-- CreateIndex
CREATE INDEX "MocoContributionTowerBlock_userId_createdAt_idx" ON "MocoContributionTowerBlock"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MocoContributionTowerBlock" ADD CONSTRAINT "MocoContributionTowerBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MocoContributionTowerBlock" ADD CONSTRAINT "MocoContributionTowerBlock_gemPurchaseId_fkey" FOREIGN KEY ("gemPurchaseId") REFERENCES "GemPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
