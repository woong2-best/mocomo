import livingPresetJson from "../../../public/diorama/living-preset.json";
import type { StickerInstance } from "./sticker-types";
import { enrichInstanceFromCatalog } from "./sticker-instance-utils";
import {
  getDioramaPresetForRoom,
  LIVING_ROOM_PRESET,
  type DioramaPreset,
} from "@/lib/apt/game/room-presets";

type LivingPresetSticker = {
  id: string;
  assetId: string;
  x: number;
  y: number;
  zIndex: number;
  scale?: number;
  rotation?: number;
  linkTo?: string;
  draggable?: boolean;
};

function buildLegacyLivingInstances(): StickerInstance[] {
  const stickers = (livingPresetJson as { stickers: LivingPresetSticker[] }).stickers;
  return stickers.map((s) => ({
    id: s.id,
    typeId: s.assetId,
    x: s.x,
    y: s.y,
    zIndex: s.zIndex,
    scale: s.scale ?? 1,
    rotation: s.rotation ?? 0,
    linkTo: s.linkTo,
    draggable: s.draggable ?? true,
  }));
}

/** 예전 데모용 65개 프리셋이 DB/local에 남아 있으면 빈 방으로 초기화 */
export function isLegacyPackedDefaultLayout(instances: StickerInstance[]): boolean {
  if (instances.length < 30) return false;
  return instances.some((s) => s.id === "sofa-main" || s.id === "mascot-sit");
}

export const LIVING_ROOM_DIORAMA: DioramaPreset = LIVING_ROOM_PRESET;

export function getDioramaPreset(roomId: string, roomType: string): DioramaPreset | null {
  return getDioramaPresetForRoom(roomId, roomType);
}

export function getDefaultStickerInstances(roomId: string, roomType: string): StickerInstance[] {
  const preset = getDioramaPreset(roomId, roomType);
  if (!preset) return [];
  if (roomId === "living" || roomType === "living") {
    const legacy = buildLegacyLivingInstances();
    if (legacy.length > 0 && legacy.length < 30) {
      return legacy.map((s) => enrichInstanceFromCatalog(s));
    }
  }
  return preset.defaultInstances.map((s) => enrichInstanceFromCatalog({ ...s }));
}

export { type DioramaPreset };
