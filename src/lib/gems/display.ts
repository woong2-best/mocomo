/** Format gem count for UI (1 gem = $0.01) */
export function formatGemDisplay(gems: number): string {
  const n = Math.max(0, Math.floor(gems));
  return `${n.toLocaleString()} Gems`;
}

export function formatGemUsdEquivalent(gems: number): string {
  return `$${(gems / 100).toFixed(2)}`;
}
