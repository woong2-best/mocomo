-- Recalculate support tiers with new MOCO thresholds

CREATE OR REPLACE FUNCTION support_tier_from_amount(amt int) RETURNS "SupportTierLevel" AS $$
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

UPDATE "User"
SET "supportTierSent" = support_tier_from_amount("totalSupportSent");

UPDATE "User"
SET "supportTierReceived" = support_tier_from_amount("totalSupportReceived");

UPDATE "CreatorSupport"
SET "tier" = support_tier_from_amount("totalAmount");

DROP FUNCTION support_tier_from_amount(int);
