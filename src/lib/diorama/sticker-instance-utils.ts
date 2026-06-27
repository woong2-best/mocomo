import type { StickerFunction, StickerInstance } from "./sticker-types";
import { getStickerAsset } from "./sticker-catalog";

/** room-shell 내부 배치 허용 영역 (%) */
export const STICKER_ROOM_BOUNDS = {
  xMin: 28,
  xMax: 72,
  yMin: 20,
  yMax: 78,
} as const;

const NON_DRAGGABLE_TYPES = new Set([
  "door",
  "window",
  "frame",
  "frame-small",
  "poster",
  "clock",
  "garland",
  "hanging-plant",
]);

/** 구조물·벽 장식은 드래그 불가 */
export function isStickerDraggable(typeId: string): boolean {
  if (NON_DRAGGABLE_TYPES.has(typeId)) return false;
  const asset = getStickerAsset(typeId);
  if (!asset) return false;
  if (asset.category === "room") return false;
  return true;
}

/** 기능 스티커 → 라우트 (패널/모달은 linkTo 없이 콜백 유지) */
export function linkForFunction(fn: StickerFunction): string | undefined {
  switch (fn) {
    case "community":
      return "/";
    default:
      return undefined;
  }
}

export function clampStickerPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(STICKER_ROOM_BOUNDS.xMax, Math.max(STICKER_ROOM_BOUNDS.xMin, x)),
    y: Math.min(STICKER_ROOM_BOUNDS.yMax, Math.max(STICKER_ROOM_BOUNDS.yMin, y)),
  };
}

export function mergeInstanceDraggable(instance: StickerInstance): StickerInstance {
  return { ...instance, draggable: isStickerDraggable(instance.typeId) };
}

export function enrichInstanceFromCatalog(instance: StickerInstance): StickerInstance {
  const asset = getStickerAsset(instance.typeId);
  const linkTo = instance.linkTo ?? (asset?.function ? linkForFunction(asset.function) : undefined);
  return mergeInstanceDraggable({
    ...instance,
    linkTo,
    scale: instance.scale ?? 1,
    rotation: instance.rotation ?? 0,
  });
}

export function bringDraggableToFront(
  instances: StickerInstance[],
  instanceId: string
): StickerInstance[] {
  const target = instances.find((s) => s.id === instanceId);
  if (!target?.draggable) return instances;
  const maxZ = instances
    .filter((s) => s.draggable)
    .reduce((m, s) => Math.max(m, s.zIndex), 0);
  return instances.map((s) =>
    s.id === instanceId ? { ...s, zIndex: maxZ + 1 } : s
  );
}

/** 스티커 발바닥 반경 (%) — 겹침 판정용 */
function footprintRadiusPct(typeId: string, scale = 1): number {
  const asset = getStickerAsset(typeId);
  const base = asset?.defaultWidth ?? 80;
  return (base / 110) * 4.2 * scale;
}

function depthLayer(typeId: string, y: number): number {
  const asset = getStickerAsset(typeId);
  if (!asset) return 1;
  if (typeId === "rug") return 0;
  if (asset.category === "room") return 0;
  if (y < 36) return 0;
  if (y < 52) return 1;
  return 2;
}

/** 위→아래(y) 깊이순 z-index — 앞쪽 가구가 뒤 가구를 가리지 않게 */
export function sortInstancesByDepth(instances: StickerInstance[]): StickerInstance[] {
  return [...instances]
    .sort((a, b) => {
      const layerA = depthLayer(a.typeId, a.y);
      const layerB = depthLayer(b.typeId, b.y);
      if (layerA !== layerB) return layerA - layerB;
      if (Math.abs(a.y - b.y) > 0.25) return a.y - b.y;
      return a.x - b.x;
    })
    .map((s, i) => ({ ...s, zIndex: 10 + i }));
}

/** 다른 가구와 겹치면 살짝 밀어낸 배치 좌표 */
export function resolvePlacementPosition(
  x: number,
  y: number,
  typeId: string,
  instances: StickerInstance[],
  excludeId?: string
): { x: number; y: number } {
  let pos = clampStickerPosition(x, y);
  const myR = footprintRadiusPct(typeId);

  for (let i = 0; i < 18; i++) {
    const conflict = instances.find((s) => {
      if (excludeId && s.id === excludeId) return false;
      const theirR = footprintRadiusPct(s.typeId, s.scale ?? 1);
      const dx = s.x - pos.x;
      const dy = s.y - pos.y;
      return Math.hypot(dx, dy) < myR + theirR + 2.4;
    });
    if (!conflict) break;
    const angle = i * 0.85 + Math.atan2(pos.y - 52, pos.x - 50);
    const push = 2.2 + i * 0.55;
    pos = clampStickerPosition(
      x + Math.cos(angle) * push,
      y + Math.sin(angle) * push * 0.65
    );
  }
  return pos;
}

export function finalizeInstancesLayout(
  instances: StickerInstance[],
  movedId?: string,
  rawX?: number,
  rawY?: number
): StickerInstance[] {
  let next = instances;
  if (movedId != null && rawX != null && rawY != null) {
    const target = instances.find((s) => s.id === movedId);
    if (target) {
      const others = instances.filter((s) => s.id !== movedId);
      const { x, y } = resolvePlacementPosition(rawX, rawY, target.typeId, others, movedId);
      next = instances.map((s) => (s.id === movedId ? { ...s, x, y } : s));
    }
  }
  return sortInstancesByDepth(next);
}
