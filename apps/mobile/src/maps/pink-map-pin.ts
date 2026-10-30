/** Shared glossy pink map pin — keep visual head size at the old 14px circle. */
export const PINK_MAP_PIN_IMAGE_ID = "pink-map-pin";

/** 256×320 source. 0.073 ≈ 14px head (previous `circle-radius: 7`). */
export const PINK_MAP_PIN_ICON_SIZE = 0.073;
export const PINK_MAP_PIN_ICON_SIZE_SELECTED = 0.083;

export const PINK_MAP_PIN_SYMBOL_LAYOUT = {
  "icon-image": PINK_MAP_PIN_IMAGE_ID,
  "icon-size": PINK_MAP_PIN_ICON_SIZE,
  "icon-anchor": "bottom" as const,
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "icon-pitch-alignment": "viewport" as const,
  "icon-rotation-alignment": "viewport" as const,
};

export function pinkMapPinSymbolLayout(selected = false) {
  return {
    ...PINK_MAP_PIN_SYMBOL_LAYOUT,
    "icon-size": selected ? PINK_MAP_PIN_ICON_SIZE_SELECTED : PINK_MAP_PIN_ICON_SIZE,
  };
}
