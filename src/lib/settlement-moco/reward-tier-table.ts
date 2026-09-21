/** Creator Reward tier table — 1 MOCO face $5, platform 5%, creator net $4.75/MOCO */
export type CreatorRewardTierRow = {
  label: string;
  requiredMoco: number;
  rewardUsd: number;
};

export const CREATOR_REWARD_TIER_TABLE: readonly CreatorRewardTierRow[] = [
  { label: "Novice", requiredMoco: 0, rewardUsd: 0 },
  { label: "Pulse", requiredMoco: 10, rewardUsd: 47.5 },
  { label: "Nexus", requiredMoco: 15, rewardUsd: 71.25 },
  { label: "Matrix", requiredMoco: 30, rewardUsd: 142.5 },
  { label: "Flux", requiredMoco: 50, rewardUsd: 237.5 },
  { label: "Vortex", requiredMoco: 60, rewardUsd: 285 },
  { label: "Horizon", requiredMoco: 70, rewardUsd: 332.5 },
  { label: "Genesis", requiredMoco: 90, rewardUsd: 427.5 },
  { label: "Continuum", requiredMoco: 120, rewardUsd: 570 },
  { label: "Singularity", requiredMoco: 160, rewardUsd: 760 },
  { label: "Zenith", requiredMoco: 200, rewardUsd: 950 },
  { label: "Eclipse", requiredMoco: 260, rewardUsd: 1235 },
  { label: "Aether", requiredMoco: 350, rewardUsd: 1662.5 },
  { label: "Eternity", requiredMoco: 500, rewardUsd: 2375 },
  { label: "Transcend", requiredMoco: 700, rewardUsd: 3325 },
  { label: "Infinity", requiredMoco: 1000, rewardUsd: 4750 },
  { label: "Cosmos", requiredMoco: 1500, rewardUsd: 7125 },
  { label: "Dimension", requiredMoco: 2200, rewardUsd: 10450 },
  { label: "Chronos", requiredMoco: 3200, rewardUsd: 15200 },
  { label: "Omniverse", requiredMoco: 4500, rewardUsd: 21375 },
  { label: "Absolute", requiredMoco: 6500, rewardUsd: 30875 },
  { label: "Primeval", requiredMoco: 9000, rewardUsd: 42750 },
  { label: "Firmament", requiredMoco: 13000, rewardUsd: 61750 },
  { label: "Aethelgard", requiredMoco: 18000, rewardUsd: 85500 },
  { label: "Supernova", requiredMoco: 25000, rewardUsd: 118750 },
  { label: "Empyrean", requiredMoco: 35000, rewardUsd: 166250 },
  { label: "Aethelos", requiredMoco: 48000, rewardUsd: 228000 },
  { label: "Sovereign", requiredMoco: 65000, rewardUsd: 308750 },
  { label: "Origin", requiredMoco: 82000, rewardUsd: 389500 },
  { label: "Supreme", requiredMoco: 100000, rewardUsd: 475000 },
] as const;

export function achievedCreatorRewardTier(earnedMoco: number): CreatorRewardTierRow {
  for (let i = CREATOR_REWARD_TIER_TABLE.length - 1; i >= 0; i--) {
    const row = CREATOR_REWARD_TIER_TABLE[i]!;
    if (earnedMoco >= row.requiredMoco) return row;
  }
  return CREATOR_REWARD_TIER_TABLE[0]!;
}

export function formatRewardUsd(usd: number): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
