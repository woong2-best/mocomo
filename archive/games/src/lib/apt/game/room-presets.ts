import type { StickerInstance } from "@/lib/diorama/sticker-types";
import { enrichInstanceFromCatalog } from "@/lib/diorama/sticker-instance-utils";
import {
  LIVING_CORNER_PRESET,
} from "@/lib/diorama/living-corner-preset";

export type DioramaPreset = {
  id: string;
  label: string;
  backdropAssetId: string;
  defaultInstances: StickerInstance[];
};

function inst(
  id: string,
  typeId: string,
  x: number,
  y: number,
  z: number,
  extra?: Partial<StickerInstance>
): StickerInstance {
  return enrichInstanceFromCatalog({
    id,
    typeId,
    x,
    y,
    zIndex: z,
    scale: 1,
    rotation: 0,
    draggable: true,
    ...extra,
  });
}

/** @deprecated A-3 — use LIVING_CORNER_PRESET */
export const LIVING_ROOM_PRESET: DioramaPreset = LIVING_CORNER_PRESET;

export const BEDROOM_PRESET: DioramaPreset = {
  id: "bedroom",
  label: "침실",
  backdropAssetId: "room-shell",
  defaultInstances: [
    inst("br-rug", "rug", 50, 70, 1),
    inst("br-bed", "bed", 45, 55, 5),
    inst("br-lamp", "lamp", 78, 45, 6),
    inst("br-frame", "frame", 22, 38, 7),
    inst("br-books", "books", 68, 52, 8),
    inst("br-cushion", "cushion", 58, 62, 9),
    inst("br-plant", "plant", 15, 50, 10),
    inst("br-polaroid", "polaroid", 32, 42, 11),
  ],
};

export const KITCHEN_PRESET: DioramaPreset = {
  id: "kitchen",
  label: "부엌",
  backdropAssetId: "room-shell",
  defaultInstances: [
    inst("kt-rug", "rug", 50, 68, 1),
    inst("kt-desk", "desk", 50, 55, 4),
    inst("kt-chair", "chair", 42, 68, 5),
    inst("kt-shelf", "shelf", 75, 40, 6),
    inst("kt-plant", "plant", 18, 45, 7),
    inst("kt-mug", "mug", 52, 48, 8),
    inst("kt-clock", "clock", 85, 35, 9),
    inst("kt-snack", "snack-plate", 58, 52, 10),
  ],
};

export const BATHROOM_PRESET: DioramaPreset = {
  id: "bathroom",
  label: "욕실",
  backdropAssetId: "room-shell",
  defaultInstances: [
    inst("ba-rug", "rug", 48, 70, 1),
    inst("ba-mirror", "mirror", 72, 38, 5),
    inst("ba-plant", "plant", 20, 48, 6),
    inst("ba-basket", "basket", 45, 65, 7),
    inst("ba-candle", "candle", 58, 42, 8),
    inst("ba-slippers", "slippers", 35, 72, 9),
    inst("ba-garland", "garland", 50, 32, 10),
  ],
};

const BY_TYPE: Record<string, DioramaPreset> = {
  living: LIVING_ROOM_PRESET,
  bedroom: BEDROOM_PRESET,
  kitchen: KITCHEN_PRESET,
  bathroom: BATHROOM_PRESET,
};

const BY_ID: Record<string, DioramaPreset> = {
  living: LIVING_ROOM_PRESET,
  "bedroom-1": BEDROOM_PRESET,
  "bedroom-2": BEDROOM_PRESET,
  "bedroom-3": BEDROOM_PRESET,
  kitchen: KITCHEN_PRESET,
  bathroom: BATHROOM_PRESET,
};

export function getDioramaPresetForRoom(roomId: string, roomType: string): DioramaPreset | null {
  return BY_ID[roomId] ?? BY_TYPE[roomType] ?? null;
}
