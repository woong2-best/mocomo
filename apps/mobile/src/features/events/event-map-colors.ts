import { mapPinColorForCategory } from "@/maps/map-pin";

/** Pin colors aligned with web maid / user / event icons */
export const EVENT_PIN_COLORS: Record<string, string> = {
  comic: "#3b82f6",
  anime: "#3b82f6",
  cosplay: "#3b82f6",
  goods: "#3b82f6",
  maid_cafe: "#ff69b4",
  user_recommendation: "#22c55e",
  other: "#3b82f6",
};

export function eventPinColor(category: string) {
  return mapPinColorForCategory(category);
}
