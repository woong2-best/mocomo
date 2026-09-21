/**
 * 월말 Reward 정산 등급 — `reward-tier-table.ts` (Novice/Pulse/…)
 * 후원 광석 등급(SEED/STONE/…)과 무관합니다.
 */
export {
  achievedCreatorRewardTier as achievedSettlementRewardTier,
  CREATOR_REWARD_TIER_TABLE as REWARD_TIER_TABLE,
  type CreatorRewardTierRow as SettlementRewardTierRow,
} from "@/lib/settlement-moco/reward-tier-table";
