import type { StickerInstance } from "./sticker-types";
import { enrichInstanceFromCatalog } from "./sticker-instance-utils";
import {
  getDioramaPresetForRoom,
  LIVING_ROOM_PRESET,
  type DioramaPreset,
} from "@/lib/apt/game/room-presets";

/** 예전 데모용 65개 프리셋이 DB/local에 남아 있으면 빈 방으로 초기화 */
export function isLegacyPackedDefaultLayout(instances: StickerInstance[]): boolean {
  if (instances.length >= 30) return true;
  if (instances.length >= 14 && instances.some((s) => s.id === "sofa-main" || s.id === "mascot-sit")) {
    return true;
  }
  return false;
}

export const LIVING_ROOM_DIORAMA: DioramaPreset = LIVING_ROOM_PRESET;

export function getDioramaPreset(roomId: string, roomType: string): DioramaPreset | null {
  return getDioramaPresetForRoom(roomId, roomType);
}

export function getDefaultStickerInstances(roomId: string, roomType: string): StickerInstance[] {
  const preset = getDioramaPreset(roomId, roomType);
  if (!preset) return [];
  return preset.defaultInstances.map((s) => enrichInstanceFromCatalog({ ...s }));
}

export { type DioramaPreset };
