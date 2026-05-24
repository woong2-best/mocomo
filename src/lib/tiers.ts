import { SupportTierLevel } from "@prisma/client";

export type TierDefinition = {
  level: SupportTierLevel;
  label: string;
  labelKo: string;
  minAmount: number;
  color: string;
  gradient: [string, string];
  perks: string[];
};

/** 사이트 전체 누적 · 크리에이터별 개별 후원 공통 등급표 */
export const SUPPORT_TIERS: TierDefinition[] = [
  { level: "PEBBLE", label: "Pebble", labelKo: "조약돌", minAmount: 0, color: "#9ca3af", gradient: ["#d1d5db", "#6b7280"], perks: ["기본 팬 배지"] },
  { level: "STONE", label: "Stone", labelKo: "돌", minAmount: 10_000, color: "#78716c", gradient: ["#a8a29e", "#57534e"], perks: ["닉네임 색상"] },
  { level: "COAL", label: "Coal", labelKo: "석탄", minAmount: 30_000, color: "#374151", gradient: ["#4b5563", "#111827"], perks: ["프로필 광석 뱃지"] },
  { level: "IRON", label: "Iron", labelKo: "철", minAmount: 50_000, color: "#64748b", gradient: ["#94a3b8", "#475569"], perks: ["개인 DM (크리에이터 설정 시)"] },
  { level: "BRONZE", label: "Bronze", labelKo: "청동", minAmount: 100_000, color: "#b45309", gradient: ["#d97706", "#92400e"], perks: ["광고 감소"] },
  { level: "SILVER", label: "Silver", labelKo: "은", minAmount: 300_000, color: "#94a3b8", gradient: ["#e2e8f0", "#64748b"], perks: ["비공개 글 일부 열람"] },
  { level: "GOLD", label: "Gold", labelKo: "금", minAmount: 500_000, color: "#eab308", gradient: ["#fde047", "#ca8a04"], perks: ["골드 닉네임 효과"] },
  { level: "PLATINUM", label: "Platinum", labelKo: "백금", minAmount: 1_000_000, color: "#22d3ee", gradient: ["#a5f3fc", "#0891b2"], perks: ["특별 방송 입장"] },
  { level: "EMERALD", label: "Emerald", labelKo: "에메랄드", minAmount: 3_000_000, color: "#10b981", gradient: ["#6ee7b7", "#047857"], perks: ["팬 전용 방"] },
  { level: "SAPPHIRE", label: "Sapphire", labelKo: "사파이어", minAmount: 5_000_000, color: "#3b82f6", gradient: ["#93c5fd", "#1d4ed8"], perks: ["우선 응답"] },
  { level: "RUBY", label: "Ruby", labelKo: "루비", minAmount: 10_000_000, color: "#ef4444", gradient: ["#fca5a5", "#b91c1c"], perks: ["루비 프로필 테두리"] },
  { level: "DIAMOND", label: "Diamond", labelKo: "다이아", minAmount: 30_000_000, color: "#a855f7", gradient: ["#e9d5ff", "#7c3aed"], perks: ["다이아 전용 이모지"] },
  { level: "CRYSTAL", label: "Crystal", labelKo: "크리스탈", minAmount: 50_000_000, color: "#ec4899", gradient: ["#fbcfe8", "#db2777"], perks: ["크리스탈 애니메이션"] },
  { level: "MYTHRIL", label: "Mythril", labelKo: "미스릴", minAmount: 100_000_000, color: "#6366f1", gradient: ["#c7d2fe", "#4338ca"], perks: ["미스릴 오라"] },
  { level: "ORICHALCUM", label: "Orichalcum", labelKo: "오리하르콘", minAmount: 300_000_000, color: "#f97316", gradient: ["#fdba74", "#c2410c"], perks: ["전설 후원자 목록"] },
  { level: "CELESTITE", label: "Celestite", labelKo: "천青石", minAmount: 500_000_000, color: "#38bdf8", gradient: ["#bae6fd", "#0284c7"], perks: ["천空 테마"] },
  { level: "ASTRAL", label: "Astral", labelKo: "아스트랄", minAmount: 1_000_000_000, color: "#8b5cf6", gradient: ["#ddd6fe", "#6d28d9"], perks: ["별자리 효과"] },
  { level: "COSMIC", label: "Cosmic", labelKo: "코스믹", minAmount: 3_000_000_000, color: "#06b6d4", gradient: ["#67e8f9", "#0e7490"], perks: ["우주 배너"] },
  { level: "ETERNAL", label: "Eternal", labelKo: "이터널", minAmount: 10_000_000_000, color: "#ff6ec7", gradient: ["#ffd6f5", "#c026d3"], perks: ["최고 등급 · 전체 혜택"] },
];

export function tierFromAmount(amount: number): SupportTierLevel {
  let tier: SupportTierLevel = "PEBBLE";
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
