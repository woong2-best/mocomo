-- Settlement tier engine: earnedMocoTier + payout batch tier fields

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "earnedMocoTier" "SupportTierLevel" NOT NULL DEFAULT 'SEED';

ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "achievedTier" "SupportTierLevel" NOT NULL DEFAULT 'SEED';
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "deductedMoco" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "rolloverMoco" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "rewardUsd" INTEGER NOT NULL DEFAULT 0;

-- earnedMoco 잔액 기준 등급 초기 동기화
CREATE OR REPLACE FUNCTION settlement_tier_from_earned(amt int) RETURNS "SupportTierLevel" AS $$
BEGIN
  RETURN CASE
    WHEN amt >= 7000 THEN 'COSMIC'::"SupportTierLevel"
    WHEN amt >= 6500 THEN 'ASTRAL'::"SupportTierLevel"
    WHEN amt >= 6000 THEN 'JUPITER'::"SupportTierLevel"
    WHEN amt >= 5500 THEN 'TERRA'::"SupportTierLevel"
    WHEN amt >= 5000 THEN 'LUNA'::"SupportTierLevel"
    WHEN amt >= 4500 THEN 'ORICHALCUM'::"SupportTierLevel"
    WHEN amt >= 4000 THEN 'MYTHRIL'::"SupportTierLevel"
    WHEN amt >= 3500 THEN 'DIAMOND'::"SupportTierLevel"
    WHEN amt >= 3000 THEN 'RUBY'::"SupportTierLevel"
    WHEN amt >= 2500 THEN 'SAPPHIRE'::"SupportTierLevel"
    WHEN amt >= 2000 THEN 'EMERALD'::"SupportTierLevel"
    WHEN amt >= 1500 THEN 'CRYSTAL'::"SupportTierLevel"
    WHEN amt >= 1000 THEN 'GOLD'::"SupportTierLevel"
    WHEN amt >= 500 THEN 'SILVER'::"SupportTierLevel"
    WHEN amt >= 100 THEN 'BRASS'::"SupportTierLevel"
    WHEN amt >= 50 THEN 'BRONZE'::"SupportTierLevel"
    WHEN amt >= 10 THEN 'STONE'::"SupportTierLevel"
    ELSE 'SEED'::"SupportTierLevel"
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "User" u
SET "earnedMocoTier" = settlement_tier_from_earned(COALESCE(w."settlementMocoPoints", 0))
FROM "PlatformWallet" w
WHERE w."userId" = u.id;

DROP FUNCTION settlement_tier_from_earned(int);
