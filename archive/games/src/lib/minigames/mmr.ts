/** MMR · 티어 계산 */

import type { MinigameTier } from "./types";

const K = 32;

export function tierFromMmr(mmr: number): MinigameTier {
  if (mmr >= 2400) return "CHALLENGER";
  if (mmr >= 2200) return "GRANDMASTER";
  if (mmr >= 2000) return "MASTER";
  if (mmr >= 1800) return "DIAMOND";
  if (mmr >= 1600) return "PLATINUM";
  if (mmr >= 1400) return "GOLD";
  if (mmr >= 1200) return "SILVER";
  return "BRONZE";
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function mmrDelta(winnerMmr: number, loserMmr: number, draw = false): { win: number; lose: number } {
  if (draw) {
    const e = expectedScore(winnerMmr, loserMmr);
    const d = K * (0.5 - e);
    return { win: d, lose: -d };
  }
  const eWin = expectedScore(winnerMmr, loserMmr);
  return { win: K * (1 - eWin), lose: K * (0 - (1 - eWin)) };
}

export const TIER_LABELS: Record<MinigameTier, string> = {
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  DIAMOND: "다이아",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};
