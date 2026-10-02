import type { StickerInstance } from "./sticker-types";

export function parseStickerInstances(raw: unknown): StickerInstance[] | null {
  if (!Array.isArray(raw)) return null;
  const out: StickerInstance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.typeId !== "string") continue;
    if (typeof o.x !== "number" || typeof o.y !== "number" || typeof o.zIndex !== "number") continue;
    out.push({
      id: o.id,
      typeId: o.typeId,
      x: o.x,
      y: o.y,
      zIndex: o.zIndex,
      rotation: typeof o.rotation === "number" ? o.rotation : undefined,
      scale: typeof o.scale === "number" ? o.scale : undefined,
      linkTo: typeof o.linkTo === "string" ? o.linkTo : undefined,
      draggable: typeof o.draggable === "boolean" ? o.draggable : true,
    });
  }
  return out;
}
