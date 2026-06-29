/** @deprecated — use living-room-style-lock.ts */
export {
  LIVING_CORNER_ZONES,
  LIVING_CORNER_STICKER_IDS,
  LIVING_ROOM_RC1_INSTANCES as LIVING_CORNER_INSTANCES,
  LIVING_ROOM_RC1_INSTANCES,
  isLivingRoomStyleLockLayout as isLivingCornerStyleLockLayout,
  isLivingRoomStyleLockLayout,
  type LivingCornerId,
} from "./living-room-style-lock";

import type { LivingCornerPreset } from "./living-room-style-lock";
import { LIVING_ROOM_RC1_INSTANCES } from "./living-room-style-lock";

export type { LivingCornerPreset };

export const LIVING_CORNER_PRESET: LivingCornerPreset = {
  id: "living",
  label: "거실",
  backdropAssetId: "room-shell",
  defaultInstances: LIVING_ROOM_RC1_INSTANCES,
};
