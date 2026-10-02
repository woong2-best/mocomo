import { LIVING_ROOM_CAMERA_LOCK } from "./living-room-style-lock";

export type RoomCamera = {
  scale: number;
  translateY: number;
  focusX: number;
  /** RC-1 첫 진입 미세 줌 */
  enterScale?: number;
  enterDurationMs?: number;
};

const DEFAULT: RoomCamera = { scale: 1, translateY: 0, focusX: 50 };

const L = LIVING_ROOM_CAMERA_LOCK;

export const ROOM_CAMERA: Record<string, RoomCamera> = {
  living: {
    scale: L.scale,
    translateY: L.translateY,
    focusX: L.focusX,
    enterScale: L.enterScale,
    enterDurationMs: L.enterDurationMs,
  },
  bedroom: { scale: 1.1, translateY: -2, focusX: 48 },
  kitchen: { scale: 1.14, translateY: 1, focusX: 52 },
  bathroom: { scale: 1.18, translateY: 0, focusX: 50 },
};

export function getRoomCamera(roomType: string): RoomCamera {
  return ROOM_CAMERA[roomType] ?? DEFAULT;
}
