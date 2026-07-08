export type VideoTool = "trim" | "transform" | "filter" | "adjust" | "sticker" | "audio";

export type VideoSticker = {
  id: string;
  content: string;
  /** 0–1 relative to output frame */
  x: number;
  y: number;
  scale: number;
};

export type VideoEditState = {
  startSec: number;
  endSec: number;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  /** undefined = 원본 비율 */
  cropAspect?: number;
  filterId: string;
  brightness: number;
  contrast: number;
  saturation: number;
  volume: number;
  muted: boolean;
  stickers: VideoSticker[];
};

export const DEFAULT_VIDEO_EDIT: VideoEditState = {
  startSec: 0,
  endSec: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  cropAspect: undefined,
  filterId: "none",
  brightness: 0,
  contrast: 0,
  saturation: 0,
  volume: 1,
  muted: false,
  stickers: [],
};

export function cloneVideoEdit(s: VideoEditState): VideoEditState {
  return { ...s, stickers: s.stickers.map((st) => ({ ...st })) };
}

export function videoEditEquals(a: VideoEditState, b: VideoEditState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
