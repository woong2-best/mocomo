/** Format MOCO count for UI (1 MOCO = $0.01 USD 표시 단위) */
export function formatMocoDisplay(moco: number): string {
  const n = Math.max(0, Math.floor(moco));
  return `${n.toLocaleString()} MOCO`;
}

/** @deprecated formatMocoDisplay 사용 */
export const formatGemDisplay = formatMocoDisplay;

export function formatMocoUsdEquivalent(moco: number): string {
  return `$${(moco / 100).toFixed(2)}`;
}

/** @deprecated formatMocoUsdEquivalent 사용 */
export const formatGemUsdEquivalent = formatMocoUsdEquivalent;
