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

function hoverRadius(base: number, hover: number, locked: boolean) {
  if (locked) return hover;
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    hover,
    base,
  ] as unknown as number;
}

export function mapPinCirclePaint(kind: "shadow" | "outer" | "inner", selected = false) {
  const outer = mapPinOuterRadius(false);
  const inner = mapPinInnerRadius(false);
  const hoverOuter = mapPinOuterRadius(true);
  const hoverInner = mapPinInnerRadius(true);
  if (kind === "shadow") {
    return {
      "circle-radius": hoverRadius(outer + 2, hoverOuter + 2, selected),
      "circle-color": "rgba(0,0,0,0.25)",
      "circle-blur": 0.35,
      "circle-translate": [0, 2] as [number, number],
      "circle-pitch-alignment": "viewport" as const,
    };
  }
  if (kind === "inner") {
    return {
      "circle-radius": hoverRadius(inner, hoverInner, selected),
      "circle-color": "#ffffff",
      "circle-pitch-alignment": "viewport" as const,
    };
  }
  return {
    "circle-radius": hoverRadius(outer, hoverOuter, selected),
    "circle-color": ["get", "color"] as unknown as string,
    "circle-pitch-alignment": "viewport" as const,
  };
}

export function createMapPinElement(color = MAP_PIN_PINK, sizePx = MAP_PIN_SIZE_PX): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "mocomo-map-pin";
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  el.style.backgroundColor = color;
  const inner = document.createElement("div");
  inner.className = "mocomo-map-pin-inner";
  const innerSize = Math.max(1, Math.round((sizePx * MAP_PIN_INNER_PX) / MAP_PIN_SIZE_PX));
  inner.style.width = `${innerSize}px`;
  inner.style.height = `${innerSize}px`;
  el.appendChild(inner);
  return el;
}

/** @deprecated Use createMapPinElement */
export function createPinkMapPinElement(sizePx = MAP_PIN_SIZE_PX): HTMLDivElement {
  return createMapPinElement(MAP_PIN_PINK, sizePx);
}
