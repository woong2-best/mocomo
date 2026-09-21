/** Pin colors aligned with web `SUBCULTURE_EVENT_CATEGORY_COLORS` */
export const EVENT_PIN_COLORS: Record<string, string> = {
  comic: "#8b5cf6",
  anime: "#3b82f6",
  cosplay: "#d946ef",
  goods: "#f59e0b",
  maid_cafe: "#ec4899",
  user_recommendation: "#22c55e",
  other: "#64748b",
};

export function eventPinColor(category: string) {
  return EVENT_PIN_COLORS[category] ?? EVENT_PIN_COLORS.other;
}
