-- Sponsored ad: 24h = 1 MOCO from purchasedMoco → PlatformWallet.adRevenue

ALTER TABLE "PlatformWallet" ADD COLUMN "adRevenue" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "SponsoredAdCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "mocoPaid" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsoredAdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SponsoredAdCampaign_targetType_targetId_idx" ON "SponsoredAdCampaign"("targetType", "targetId");
CREATE INDEX "SponsoredAdCampaign_status_expiresAt_idx" ON "SponsoredAdCampaign"("status", "expiresAt");
CREATE INDEX "SponsoredAdCampaign_userId_createdAt_idx" ON "SponsoredAdCampaign"("userId", "createdAt");

ALTER TABLE "SponsoredAdCampaign" ADD CONSTRAINT "SponsoredAdCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
