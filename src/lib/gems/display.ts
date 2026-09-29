import { MOCO_USD_CENTS } from "@/lib/gems/constants";

/** Format MOCO count for UI */
export function formatMocoDisplay(moco: number): string {
  const n = Math.max(0, Math.floor(moco));
  return `${n.toLocaleString()} MOCO`;
}

/** 정산·후원 장부 USD 센트 → UI용 MOCO (1 MOCO = $5) */
export function ledgerCentsToMoco(cents: number): number {
  if (!Number.isFinite(cents) || cents === 0) return 0;
  return Math.max(0, Math.round(Math.abs(cents) / MOCO_USD_CENTS));
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
