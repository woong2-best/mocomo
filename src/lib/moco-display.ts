/** MOCO 표시 단위만 — 실제 결제·잔액 없음 (초기 버전) */

export const MOCO_PER_USD = 100;

export function krwToMocoDisplay(krw: number): number {
  const usd = krw / 1350;
  return Math.round(usd * MOCO_PER_USD);
}

export function usdCentsToMocoDisplay(cents: number): number {
  return Math.round((cents / 100) * MOCO_PER_USD);
}

export function formatMocoDisplay(moco: number): string {
  return `${moco.toLocaleString()} MOCO`;
}

/** 가격 옆 보조 표시 (예: ≈ 1,690 MOCO) */
export function formatKrwWithMocoHint(krw: number): string {
  if (krw <= 0) return "무료";
  return `${krw.toLocaleString()}원 · ${formatMocoDisplay(krwToMocoDisplay(krw))}`;
}
