/** Circular map pin — colored ring + white center. */

export const MAP_PIN_PINK = "#ff69b4";
export const MAP_PIN_GREEN = "#4CAF50";
export const MAP_PIN_BLUE = "#2196F3";

export const MAP_PIN_SIZE_PX = 40;
export const MAP_PIN_INNER_PX = 18;
export const MAP_PIN_OUTER_RADIUS = MAP_PIN_SIZE_PX / 2;
export const MAP_PIN_INNER_RADIUS = MAP_PIN_INNER_PX / 2;
export const MAP_PIN_SCALE_HOVER = 1.1;

export function mapPinColorForCategory(category: string, halo = false): string {
  if (halo) return MAP_PIN_PINK;
  if (category === "user_recommendation") return MAP_PIN_GREEN;
  if (category === "maid_cafe") return MAP_PIN_PINK;
  return MAP_PIN_BLUE;
}

export function mapPinOuterRadius(selected = false): number {
  return selected
    ? Math.round(MAP_PIN_OUTER_RADIUS * MAP_PIN_SCALE_HOVER)
    : MAP_PIN_OUTER_RADIUS;
}

export function mapPinInnerRadius(selected = false): number {
  return selected
    ? Math.round(MAP_PIN_INNER_RADIUS * MAP_PIN_SCALE_HOVER)
    : MAP_PIN_INNER_RADIUS;
}

/** Side-drawer globe — small filled dots with white stroke (not full-screen ring pins). */
export function mapPinGlobeDotLayers() {
  return {
    shadow: {
      "circle-radius": 8,
      "circle-color": "rgba(0,0,0,0.22)",
      "circle-blur": 0.35,
      "circle-translate": [0, 1],
      "circle-pitch-alignment": "viewport" as const,
    },
    dot: {
      "circle-radius": 7,
      "circle-color": ["get", "color"],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-pitch-alignment": "viewport" as const,
    },
  };
}

export function mapPinCircleLayers(selectedExpr = false) {
  const outer = selectedExpr
    ? (["case", ["==", ["get", "selected"], 1], mapPinOuterRadius(true), mapPinOuterRadius()] as unknown)
    : mapPinOuterRadius();
  const inner = selectedExpr
    ? (["case", ["==", ["get", "selected"], 1], mapPinInnerRadius(true), mapPinInnerRadius()] as unknown)
    : mapPinInnerRadius();
  return {
    shadow: {
      "circle-radius": selectedExpr
        ? (["case", ["==", ["get", "selected"], 1], mapPinOuterRadius(true) + 2, mapPinOuterRadius() + 2] as unknown)
        : mapPinOuterRadius() + 2,
      "circle-color": "rgba(0,0,0,0.25)",
      "circle-blur": 0.35,
      "circle-translate": [0, 2],
      "circle-pitch-alignment": "viewport",
    },
    outer: {
      "circle-radius": outer,
      "circle-color": ["get", "color"],
      "circle-pitch-alignment": "viewport",
    },
    inner: {
      "circle-radius": inner,
      "circle-color": "#ffffff",
      "circle-pitch-alignment": "viewport",
    },
  };
}
