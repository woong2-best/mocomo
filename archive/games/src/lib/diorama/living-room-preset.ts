import type { StickerInstance } from "./sticker-types";
import { enrichInstanceFromCatalog } from "./sticker-instance-utils";
import {
  getDioramaPresetForRoom,
  LIVING_ROOM_PRESET,
  type DioramaPreset,
} from "@/lib/apt/game/room-presets";
import { isLivingCornerStyleLockLayout } from "./living-corner-preset";

/** 예전 데모용 65개·과밀·구 프리셋 → RC-1 스타일 락 레이아웃으로 초기화 */
export function isLegacyPackedDefaultLayout(instances: StickerInstance[]): boolean {
  if (isLivingCornerStyleLockLayout(instances)) return false;
  if (instances.length >= 30) return true;
  if (instances.length >= 14 && instances.some((s) => s.id === "sofa-main" || s.id === "mascot-sit")) {
    return true;
  }
  if (instances.some((s) => s.id.startsWith("lr-"))) return true;
  return false;
}

export { LIVING_CORNER_PRESET, LIVING_CORNER_INSTANCES, LIVING_CORNER_ZONES } from "./living-corner-preset";
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
