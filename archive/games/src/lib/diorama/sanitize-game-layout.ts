import type { StickerInstance } from "./sticker-types";
import { STICKER_ROOM_BOUNDS } from "./sticker-instance-utils";
import { isLegacyPackedDefaultLayout } from "./living-room-preset";
import { isLivingRoomStyleLockLayout } from "./living-room-style-lock";

/** 게임 모드에서 깨진·과밀 레이아웃을 프리셋으로 되돌릴지 판단 */
export function shouldResetGameLayout(instances: StickerInstance[]): boolean {
  if (instances.length === 0) return false;
  if (isLivingRoomStyleLockLayout(instances)) return false;
  if (isLegacyPackedDefaultLayout(instances)) return true;
  if (instances.length > 24) return true;

  const outOfBounds = instances.filter(
    (s) =>
      s.x < STICKER_ROOM_BOUNDS.xMin - 4 ||
      s.x > STICKER_ROOM_BOUNDS.xMax + 4 ||
      s.y < STICKER_ROOM_BOUNDS.yMin - 4 ||
      s.y > STICKER_ROOM_BOUNDS.yMax + 4
  );
  if (outOfBounds.length >= Math.max(2, Math.ceil(instances.length * 0.25))) {
    return true;
  }

  return false;
}
