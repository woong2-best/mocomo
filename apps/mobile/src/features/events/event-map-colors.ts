/** Pin colors aligned with web subculture event map legend */
export const EVENT_PIN_COLORS: Record<string, string> = {
  comic: "#8b5cf6",
  anime: "#3b82f6",
  cosplay: "#d946ef",
  goods: "#f59e0b",
  maid_cafe: "#ec4899",
  other: "#64748b",
};

export function eventPinColor(category: string) {
  return EVENT_PIN_COLORS[category] ?? EVENT_PIN_COLORS.other;
}
