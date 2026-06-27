import type { StickerFunction } from "./sticker-types";

/** 기능 가구 위 시각 힌트 배치 (% of sticker bounds) */
export type HintLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const FUNCTION_HINT_LAYOUT: Partial<Record<string, HintLayout>> = {
  tv: { left: 14, top: 8, width: 58, height: 42 },
  mailbox: { left: 52, top: 6, width: 38, height: 36 },
  telephone: { left: 58, top: 4, width: 28, height: 28 },
  computer: { left: 10, top: 6, width: 52, height: 38 },
  wardrobe: { left: 28, top: 18, width: 44, height: 55 },
  mirror: { left: 18, top: 16, width: 64, height: 58 },
};

export type SpatialFunction = StickerFunction | "room-portal" | "exit-corridor";

export function isSpatialFunction(fn: string): fn is SpatialFunction {
  return fn === "room-portal" || fn === "exit-corridor" || [
    "live-tv", "mailbox", "phone", "community", "avatar-edit", "profile-edit",
  ].includes(fn);
}
