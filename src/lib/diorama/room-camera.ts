export type RoomCamera = {
  scale: number;
  translateY: number;
  focusX: number;
};

const DEFAULT: RoomCamera = { scale: 1, translateY: 0, focusX: 50 };

export const ROOM_CAMERA: Record<string, RoomCamera> = {
  living: { scale: 1, translateY: 0, focusX: 50 },
  bedroom: { scale: 1.1, translateY: -2, focusX: 48 },
  kitchen: { scale: 1.14, translateY: 1, focusX: 52 },
  bathroom: { scale: 1.18, translateY: 0, focusX: 50 },
};

export function getRoomCamera(roomType: string): RoomCamera {
  return ROOM_CAMERA[roomType] ?? DEFAULT;
}
