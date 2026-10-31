/** Category map pins — 14px circles matching the original event dots. */

export type MapPinKind = "maid" | "user" | "event";

export const MAP_PIN_PINK = "#ff69b4";
export const MAP_PIN_GREEN = "#22c55e";
export const MAP_PIN_BLUE = "#3b82f6";

/** Original event-map circle diameter (`circle-radius: 7`). */
export const MAP_PIN_SIZE_PX = 14;
export const MAP_PIN_SOURCE_PX = 56;
export const MAP_PIN_ICON_SIZE = MAP_PIN_SIZE_PX / MAP_PIN_SOURCE_PX;
export const MAP_PIN_ICON_SIZE_SELECTED = 16 / MAP_PIN_SOURCE_PX;

export const MAP_PIN_IMAGE_IDS = {
  maid: "pin-maid",
  user: "pin-user",
  event: "pin-event",
} as const;

export const MAP_PIN_PUBLIC_URLS = {
  maid: "/maps/pin-maid.png",
  user: "/maps/pin-user.png",
  event: "/maps/pin-event.png",
} as const;

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

export function mapPinSymbolLayout(selected = false) {
  return {
    "icon-image": ["get", "icon"] as unknown as string,
    "icon-size": selected ? MAP_PIN_ICON_SIZE_SELECTED : MAP_PIN_ICON_SIZE,
    "icon-anchor": "center" as const,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "icon-pitch-alignment": "viewport" as const,
    "icon-rotation-alignment": "viewport" as const,
  };
}

export async function addMapPinImages(map: {
  hasImage: (id: string) => boolean;
  loadImage: (url: string) => Promise<{ data: unknown }>;
  addImage: (id: string, image: unknown) => unknown;
}) {
  for (const kind of Object.keys(MAP_PIN_IMAGE_IDS) as MapPinKind[]) {
    const id = MAP_PIN_IMAGE_IDS[kind];
    if (map.hasImage(id)) continue;
    const loaded = await map.loadImage(MAP_PIN_PUBLIC_URLS[kind]);
    if (!map.hasImage(id)) map.addImage(id, loaded.data);
  }
}

export function createMapPinElement(kind: MapPinKind = "event"): HTMLImageElement {
  const el = document.createElement("img");
  el.className = "mocomo-map-pin";
  el.src = MAP_PIN_PUBLIC_URLS[kind];
  el.alt = "";
  el.draggable = false;
  el.width = MAP_PIN_SIZE_PX;
  el.height = MAP_PIN_SIZE_PX;
  el.style.width = `${MAP_PIN_SIZE_PX}px`;
  el.style.height = `${MAP_PIN_SIZE_PX}px`;
  el.style.display = "block";
  return el;
}

/** @deprecated Use createMapPinElement */
export function createPinkMapPinElement(): HTMLImageElement {
  return createMapPinElement("maid");
}
