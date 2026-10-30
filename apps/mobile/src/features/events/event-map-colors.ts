import { mapPinColorForCategory } from "@/maps/map-pin";

/** Pin colors aligned with web circular pink / green / blue pins */
export const EVENT_PIN_COLORS: Record<string, string> = {
  comic: "#2196F3",
  anime: "#2196F3",
  cosplay: "#2196F3",
  goods: "#2196F3",
  maid_cafe: "#ff69b4",
  user_recommendation: "#4CAF50",
  other: "#2196F3",
};

export function eventPinColor(category: string) {
  return mapPinColorForCategory(category);
}
