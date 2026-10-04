import { MOCO_USD_CENTS } from "@/lib/gems/constants";
import { formatMocoCount } from "@/lib/moco/decimal-amount";

/** Format MOCO count for UI. Whole numbers stay whole; 0.1 shows one decimal. */
export function formatMocoDisplay(moco: number): string {
  return `${formatMocoCount(Math.max(0, moco))} MOCO`;
}

/** 정산·후원 장부 USD 센트 → UI용 MOCO (1 MOCO = $5, 0.1 MOCO = 50 cents) */
export function ledgerCentsToMoco(cents: number): number {
  if (!Number.isFinite(cents) || cents === 0) return 0;
  const tenthCents = MOCO_USD_CENTS / 10;
  return Math.round(Math.abs(cents) / tenthCents) / 10;
}

export function formatMocoSignedFromCents(cents: number, positive: boolean): string {
  const moco = ledgerCentsToMoco(cents);
  return `${positive ? "+" : "-"}${formatMocoDisplay(moco)}`;
}

export function formatMocoNetFromCents(netCents: number): string {
  if (netCents === 0) return formatMocoDisplay(0);
  return formatMocoSignedFromCents(netCents, netCents > 0);
}

/** @deprecated formatMocoDisplay 사용 */
export const formatGemDisplay = formatMocoDisplay;
