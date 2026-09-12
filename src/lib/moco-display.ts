/** MOCO 표시 — checkout 힌트용 (1 MOCO = $5) */

import { usdCentsToMocoRequired } from "@/lib/gems/constants";

export function usdCentsToMocoDisplay(cents: number): number {
  return usdCentsToMocoRequired(cents);
}

export function formatMocoDisplay(moco: number): string {
  return `${Math.max(0, Math.floor(moco)).toLocaleString()} MOCO`;
}

/** 가격 옆 보조 표시 */
export function formatUsdWithMocoHint(usdCents: number): string {
  if (usdCents <= 0) return "무료";
  const moco = usdCentsToMocoDisplay(usdCents);
  return `${formatMocoDisplay(moco)}`;
}
