/** Format MOCO count for UI */
export function formatMocoDisplay(moco: number): string {
  const n = Math.max(0, Math.floor(moco));
  return `${n.toLocaleString()} MOCO`;
}

/** @deprecated formatMocoDisplay 사용 */
export const formatGemDisplay = formatMocoDisplay;
