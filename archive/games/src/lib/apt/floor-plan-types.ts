/** 10000×5700 mm 평면도를 1000×570 단위로 축소 */
export const PLAN_W = 1000;
export const PLAN_H = 570;
export const WALL = 6;

export type FloorStyle =
  | "wood"
  | "tile-check"
  | "tile-light"
  | "bathroom"
  | "beige"
  | "balcony";

export type RoomType =
  | "entrance"
  | "kitchen"
  | "bathroom"
  | "bedroom"
  | "living"
  | "balcony"
  | "hall";

export type AptRoom = {
  id: string;
  type: RoomType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  locked: boolean;
  floor: FloorStyle;
};

export type FloorPlanState = {
  rooms: AptRoom[];
};

export const FLOOR_STYLE_META: Record<
  FloorStyle,
  { fill: string; accent: string; label: string }
> = {
  wood: { fill: "#e8c9a0", accent: "#c9956a", label: "우드" },
  "tile-check": { fill: "#f4f4f2", accent: "#c8c8c4", label: "체크 타일" },
  "tile-light": { fill: "#ebe8e3", accent: "#d4cfc6", label: "타일" },
  bathroom: { fill: "#d4e8f4", accent: "#8eb8d4", label: "욕실" },
  beige: { fill: "#f0ebe3", accent: "#d9cfc0", label: "베이지" },
  balcony: { fill: "#e2e0da", accent: "#b8b4ac", label: "발코니" },
};
