import { SupportTierLevel } from "@prisma/client";

export type TierDefinition = {
  level: SupportTierLevel;
  label: string;
  labelKo: string;
  minAmount: number;
  color: string;
  gradient: [string, string];
  /** Custom tier badge art under /public */
  iconSrc?: string;
};

/** 사이트 전체 누적 · 크리에이터별 개별 후원 공통 등급표 (USD cents) */
export const SUPPORT_TIERS: TierDefinition[] = [
  { level: "SEED", label: "Seed", labelKo: "씨앗", minAmount: 0, color: "#84cc16", gradient: ["#d9f99d", "#65a30d"], iconSrc: "/support/tiers/seed.png" },
  { level: "STONE", label: "Stone", labelKo: "스톤", minAmount: 5_000, color: "#78716c", gradient: ["#a8a29e", "#57534e"], iconSrc: "/support/tiers/stone.png" },
  { level: "BRONZE", label: "Bronze", labelKo: "브론즈", minAmount: 10_000, color: "#b45309", gradient: ["#d97706", "#92400e"] },
  { level: "SILVER", label: "Silver", labelKo: "실버", minAmount: 100_000, color: "#94a3b8", gradient: ["#e2e8f0", "#64748b"] },
  { level: "GOLD", label: "Gold", labelKo: "골드", minAmount: 500_000, color: "#eab308", gradient: ["#fde047", "#ca8a04"] },
  { level: "CRYSTAL", label: "Crystal", labelKo: "크리스탈", minAmount: 1_000_000, color: "#ec4899", gradient: ["#fbcfe8", "#db2777"] },
  { level: "EMERALD", label: "Emerald", labelKo: "에메랄드", minAmount: 5_000_000, color: "#10b981", gradient: ["#6ee7b7", "#047857"] },
  { level: "SAPPHIRE", label: "Sapphire", labelKo: "사파이어", minAmount: 10_000_000, color: "#3b82f6", gradient: ["#93c5fd", "#1d4ed8"] },
  { level: "RUBY", label: "Ruby", labelKo: "루비", minAmount: 25_000_000, color: "#ef4444", gradient: ["#fca5a5", "#b91c1c"] },
  { level: "DIAMOND", label: "Diamond", labelKo: "다이아", minAmount: 50_000_000, color: "#a855f7", gradient: ["#e9d5ff", "#7c3aed"] },
  { level: "MYTHRIL", label: "Mythril", labelKo: "미스릴", minAmount: 100_000_000, color: "#6366f1", gradient: ["#c7d2fe", "#4338ca"] },
  { level: "ORICHALCUM", label: "Orichalcum", labelKo: "오리하르콘", minAmount: 300_000_000, color: "#f97316", gradient: ["#fdba74", "#c2410c"] },
  { level: "LUNA", label: "Luna", labelKo: "루나", minAmount: 500_000_000, color: "#cbd5e1", gradient: ["#f1f5f9", "#64748b"] },
  { level: "TERRA", label: "Terra", labelKo: "테라", minAmount: 1_000_000_000, color: "#65a30d", gradient: ["#bef264", "#365314"] },
  { level: "JUPITER", label: "Jupiter", labelKo: "주피터", minAmount: 3_000_000_000, color: "#ea580c", gradient: ["#fdba74", "#9a3412"] },
  { level: "ASTRAL", label: "Astral", labelKo: "아스트랄", minAmount: 5_000_000_000, color: "#8b5cf6", gradient: ["#ddd6fe", "#6d28d9"] },
  { level: "COSMIC", label: "Cosmic", labelKo: "코스믹", minAmount: 10_000_000_000, color: "#06b6d4", gradient: ["#67e8f9", "#0e7490"] },
];

export function tierFromAmount(amount: number): SupportTierLevel {
  let tier: SupportTierLevel = "SEED";
  for (const t of SUPPORT_TIERS) {
    if (amount >= t.minAmount) tier = t.level;
  }
  return tier;
}

export function getTierInfo(level: SupportTierLevel): TierDefinition {
  return SUPPORT_TIERS.find((t) => t.level === level) ?? SUPPORT_TIERS[0];
}

export function getNextTierInfo(totalAmount: number) {
  const current = tierFromAmount(totalAmount);
  const idx = SUPPORT_TIERS.findIndex((t) => t.level === current);
  const next = SUPPORT_TIERS[idx + 1];
  if (!next) return null;
  return {
    ...next,
    remaining: Math.max(0, next.minAmount - totalAmount),
  };
}

export function canAccessDm(userTier: SupportTierLevel, required: SupportTierLevel): boolean {
  const order = SUPPORT_TIERS.map((t) => t.level);
  return order.indexOf(userTier) >= order.indexOf(required);
}

export function formatTierAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(amount % 10_000 === 0 ? 0 : 1)}만`;
  return amount.toLocaleString();
}
