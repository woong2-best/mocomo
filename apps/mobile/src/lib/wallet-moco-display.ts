/** 1 MOCO = $5 — sync with src/lib/gems/constants.ts */
const MOCO_USD_CENTS = 500;

export function ledgerCentsToMoco(cents: number): number {
  if (!Number.isFinite(cents) || cents === 0) return 0;
  return Math.max(0, Math.round(Math.abs(cents) / MOCO_USD_CENTS));
}

export function formatMocoDisplay(moco: number): string {
  const n = Math.max(0, Math.floor(moco));
  return `${n.toLocaleString()} MOCO`;
}

export function formatMocoSignedFromCents(cents: number, positive: boolean): string {
  const moco = ledgerCentsToMoco(cents);
  return `${positive ? "+" : "-"}${formatMocoDisplay(moco)}`;
}

export function formatMocoNetFromCents(netCents: number): string {
  if (netCents === 0) return formatMocoDisplay(0);
  return formatMocoSignedFromCents(netCents, netCents > 0);
}
