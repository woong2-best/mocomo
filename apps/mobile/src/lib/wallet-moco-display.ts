/** 1 MOCO = $5 — sync with src/lib/gems/constants.ts */
const MOCO_USD_CENTS = 500;

export function ledgerCentsToMoco(cents: number): number {
  if (!Number.isFinite(cents) || cents === 0) return 0;
  return Math.round(Math.abs(cents) / (MOCO_USD_CENTS / 10)) / 10;
}

export function formatMocoDisplay(moco: number): string {
  const tenths = Math.round(Math.max(0, moco) * 10);
  const value = tenths / 10;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} MOCO`;
}

export function formatMocoSignedFromCents(cents: number, positive: boolean): string {
  const moco = ledgerCentsToMoco(cents);
  return `${positive ? "+" : "-"}${formatMocoDisplay(moco)}`;
}

export function formatMocoNetFromCents(netCents: number): string {
  if (netCents === 0) return formatMocoDisplay(0);
  return formatMocoSignedFromCents(netCents, netCents > 0);
}
