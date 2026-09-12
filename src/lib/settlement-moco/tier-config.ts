import type { SupportTierLevel } from "@prisma/client";

/** 1 earned MOCO = $5 가치, 플랫폼 수수료 10% 제외 후 90% 정산 */
export const SETTLEMENT_MOCO_USD_VALUE = 5;
export const SETTLEMENT_PLATFORM_FEE_RATE = 0.1;
export const SETTLEMENT_REWARD_RATE = 1 - SETTLEMENT_PLATFORM_FEE_RATE;

export type SettlementTierConfig = {
  tier: SupportTierLevel;
  requiredMoco: number;
  rewardUsd: number;
};

/** 정산 등급표 — requiredMoco 내림차순 (최상위 등급 우선 탐색) */
export const TIER_CONFIG = [
  { tier: "COSMIC", requiredMoco: 7000, rewardUsd: 31500 },
  { tier: "ASTRAL", requiredMoco: 6500, rewardUsd: 29250 },
  { tier: "JUPITER", requiredMoco: 6000, rewardUsd: 27000 },
  { tier: "TERRA", requiredMoco: 5500, rewardUsd: 24750 },
  { tier: "LUNA", requiredMoco: 5000, rewardUsd: 22500 },
  { tier: "ORICHALCUM", requiredMoco: 4500, rewardUsd: 20250 },
  { tier: "MYTHRIL", requiredMoco: 4000, rewardUsd: 18000 },
  { tier: "DIAMOND", requiredMoco: 3500, rewardUsd: 15750 },
  { tier: "RUBY", requiredMoco: 3000, rewardUsd: 13500 },
  { tier: "SAPPHIRE", requiredMoco: 2500, rewardUsd: 11250 },
  { tier: "EMERALD", requiredMoco: 2000, rewardUsd: 9000 },
  { tier: "CRYSTAL", requiredMoco: 1500, rewardUsd: 6750 },
  { tier: "GOLD", requiredMoco: 1000, rewardUsd: 4500 },
  { tier: "SILVER", requiredMoco: 500, rewardUsd: 2250 },
  { tier: "BRASS", requiredMoco: 100, rewardUsd: 450 },
  { tier: "BRONZE", requiredMoco: 50, rewardUsd: 225 },
  { tier: "STONE", requiredMoco: 10, rewardUsd: 45 },
  { tier: "SEED", requiredMoco: 0, rewardUsd: 0 },
] as const satisfies readonly SettlementTierConfig[];

export function achievedSettlementTier(earnedMoco: number): SettlementTierConfig {
  for (const row of TIER_CONFIG) {
    if (earnedMoco >= row.requiredMoco) return row;
  }
  return TIER_CONFIG[TIER_CONFIG.length - 1]!;
}

export function settlementTierConfig(level: SupportTierLevel): SettlementTierConfig {
  return TIER_CONFIG.find((t) => t.tier === level) ?? TIER_CONFIG[TIER_CONFIG.length - 1]!;
}
