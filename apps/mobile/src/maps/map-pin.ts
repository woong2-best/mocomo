import { MAP_PIN_DATA_URIS } from "@/maps/map-pin-data";

/** Category map pins — 40px circles, same as the previous round pins. */

export type MapPinKind = "maid" | "user" | "event";

export const MAP_PIN_PINK = "#ff69b4";
export const MAP_PIN_GREEN = "#22c55e";
export const MAP_PIN_BLUE = "#3b82f6";

export const MAP_PIN_SIZE_PX = 40;
export const MAP_PIN_SOURCE_PX = 160;
export const MAP_PIN_ICON_SIZE = MAP_PIN_SIZE_PX / MAP_PIN_SOURCE_PX;
export const MAP_PIN_ICON_SIZE_SELECTED = 44 / MAP_PIN_SOURCE_PX;

export const MAP_PIN_IMAGE_IDS = {
  maid: "pin-maid",
  user: "pin-user",
  event: "pin-event",
} as const;

export const MAP_PIN_DATA_URI_BY_KIND = MAP_PIN_DATA_URIS;

export function mapPinKindForCategory(category: string): MapPinKind {
  if (category === "maid_cafe") return "maid";
  if (category === "user_recommendation") return "user";
  return "event";
}

export function mapPinColorForCategory(category: string): string {
  const kind = mapPinKindForCategory(category);
  if (kind === "maid") return MAP_PIN_PINK;
  if (kind === "user") return MAP_PIN_GREEN;
  return MAP_PIN_BLUE;
}

export function mapPinImageIdForCategory(category: string): string {
  return MAP_PIN_IMAGE_IDS[mapPinKindForCategory(category)];
}

export function mapPinSymbolLayout(selectedExpr = false) {
  return {
    "icon-image": ["get", "icon"],
    "icon-size": selectedExpr
      ? (["case", ["==", ["get", "selected"], 1], MAP_PIN_ICON_SIZE_SELECTED, MAP_PIN_ICON_SIZE] as unknown)
      : MAP_PIN_ICON_SIZE,
    "icon-anchor": "center" as const,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "icon-pitch-alignment": "viewport" as const,
    "icon-rotation-alignment": "viewport" as const,
  };
}
