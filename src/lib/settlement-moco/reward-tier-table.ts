/** Creator Reward tier table — published settlement amounts (legal QnA). */
export type CreatorRewardTierRow = {
  label: string;
  requiredMoco: number;
  rewardUsd: number;
};

export const CREATOR_REWARD_TIER_TABLE: readonly CreatorRewardTierRow[] = [
  { label: "Novice", requiredMoco: 0, rewardUsd: 0 },
  { label: "Pulse", requiredMoco: 10, rewardUsd: 47.25 },
  { label: "Nexus", requiredMoco: 15, rewardUsd: 70.91 },
  { label: "Matrix", requiredMoco: 30, rewardUsd: 141.9 },
  { label: "Flux", requiredMoco: 50, rewardUsd: 236.63 },
  { label: "Vortex", requiredMoco: 60, rewardUsd: 284.1 },
  { label: "Horizon", requiredMoco: 70, rewardUsd: 331.63 },
  { label: "Genesis", requiredMoco: 90, rewardUsd: 430.2 },
  { label: "Continuum", requiredMoco: 120, rewardUsd: 573.9 },
  { label: "Singularity", requiredMoco: 160, rewardUsd: 765.6 },
  { label: "Zenith", requiredMoco: 200, rewardUsd: 957.5 },
  { label: "Eclipse", requiredMoco: 260, rewardUsd: 1245.4 },
  { label: "Aether", requiredMoco: 350, rewardUsd: 1677.38 },
  { label: "Eternity", requiredMoco: 500, rewardUsd: 2417.5 },
  { label: "Transcend", requiredMoco: 700, rewardUsd: 3386.25 },
  { label: "Infinity", requiredMoco: 1000, rewardUsd: 4840 },
  { label: "Cosmos", requiredMoco: 1500, rewardUsd: 7263.75 },
  { label: "Dimension", requiredMoco: 2200, rewardUsd: 10659 },
  { label: "Chronos", requiredMoco: 3200, rewardUsd: 15512 },
  { label: "Omniverse", requiredMoco: 4500, rewardUsd: 22005 },
  { label: "Absolute", requiredMoco: 6500, rewardUsd: 31801.25 },
  { label: "Primeval", requiredMoco: 9000, rewardUsd: 44055 },
  { label: "Firmament", requiredMoco: 13000, rewardUsd: 63667.5 },
  { label: "Aethelgard", requiredMoco: 18000, rewardUsd: 88200 },
  { label: "Supernova", requiredMoco: 25000, rewardUsd: 122562.5 },
  { label: "Empyrean", requiredMoco: 35000, rewardUsd: 172900 },
  { label: "Aethelos", requiredMoco: 48000, rewardUsd: 237240 },
  { label: "Sovereign", requiredMoco: 65000, rewardUsd: 321425 },
  { label: "Origin", requiredMoco: 82000, rewardUsd: 405695 },
  { label: "Supreme", requiredMoco: 100000, rewardUsd: 495000 },
] as const;

export function achievedCreatorRewardTier(earnedMoco: number): CreatorRewardTierRow {
  for (let i = CREATOR_REWARD_TIER_TABLE.length - 1; i >= 0; i--) {
    const row = CREATOR_REWARD_TIER_TABLE[i]!;
    if (earnedMoco >= row.requiredMoco) return row;
  }
  return CREATOR_REWARD_TIER_TABLE[0]!;
}

export type RewardTierProgress = {
  currentLabel: string;
  currentRequiredMoco: number;
  currentRewardUsd: number;
  nextLabel: string | null;
  nextRequiredMoco: number | null;
  nextRewardUsd: number | null;
  /** 다음 정산 등급까지 더 받아야 하는 MOCO. 최고 등급이면 0 */
  mocoRemaining: number;
  atMaxTier: boolean;
};

/** 남은 정산 MOCO 잔액 기준 현재 등급과 다음 등급까지 남은 수량 (온디맨드·UI) */
export function rewardTierProgress(earnedMoco: number): RewardTierProgress {
  const earned = Math.max(0, Math.floor(earnedMoco));
  const current = achievedCreatorRewardTier(earned);
  const index = CREATOR_REWARD_TIER_TABLE.findIndex((row) => row.label === current.label);
  const next = index >= 0 ? CREATOR_REWARD_TIER_TABLE[index + 1] : undefined;
  if (!next) {
    return {
      currentLabel: current.label,
      currentRequiredMoco: current.requiredMoco,
      currentRewardUsd: current.rewardUsd,
      nextLabel: null,
      nextRequiredMoco: null,
      nextRewardUsd: null,
      mocoRemaining: 0,
      atMaxTier: true,
    };
  }
  return {
    currentLabel: current.label,
    currentRequiredMoco: current.requiredMoco,
    currentRewardUsd: current.rewardUsd,
    nextLabel: next.label,
    nextRequiredMoco: next.requiredMoco,
    nextRewardUsd: next.rewardUsd,
    mocoRemaining: Math.max(0, next.requiredMoco - earned),
    atMaxTier: false,
  };
}

export function formatRewardUsd(usd: number): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
