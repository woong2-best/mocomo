import type { BondeePlacedItem } from "@/lib/apt/bondee/types";

function item(
  id: string,
  kind: BondeePlacedItem["kind"],
  roomId: string,
  gx: number,
  gz: number,
  rot: 0 | 1 | 2 | 3 = 0
): BondeePlacedItem {
  return { id, kind, roomId, gx, gz, rot };
}

const LIVING: BondeePlacedItem[] = [
  item("lr-rug", "rug", "living", 0, 1, 0),
  item("lr-sofa", "sofa", "living", -1, 0, 0),
  item("lr-coffee", "coffee_table", "living", 0, 0, 0),
  item("lr-tv", "tv_stand", "living", 1, -1, 0),
  item("lr-plant", "plant", "living", -2, -1, 0),
  item("lr-lamp", "floor_lamp", "living", 2, -1, 0),
];

const BEDROOM: BondeePlacedItem[] = [
  item("br-rug", "rug", "bedroom-1", 0, 1, 0),
  item("br-bed", "bed", "bedroom-1", 0, 0, 0),
  item("br-lamp", "floor_lamp", "bedroom-1", 2, -1, 0),
  item("br-books", "bookshelf", "bedroom-1", -2, -1, 0),
];

const BEDROOM_2: BondeePlacedItem[] = [
  item("br2-rug", "rug", "bedroom-2", 0, 1, 0),
  item("br2-bed", "bed", "bedroom-2", 0, 0, 0),
  item("br2-desk", "desk", "bedroom-2", -2, 0, 1),
];

const KITCHEN: BondeePlacedItem[] = [
  item("kt-rug", "rug", "kitchen", 0, 1, 0),
  item("kt-desk", "desk", "kitchen", 0, 0, 0),
  item("kt-shelf", "shelf_small", "kitchen", 2, -1, 0),
  item("kt-plant", "plant", "kitchen", -2, -1, 0),
];

const BATHROOM: BondeePlacedItem[] = [
  item("ba-rug", "rug", "bathroom", 0, 1, 0),
  item("ba-shelf", "shelf_small", "bathroom", 1, -1, 0),
  item("ba-plant", "plant", "bathroom", -1, -1, 0),
];

const BY_ROOM: Record<string, BondeePlacedItem[]> = {
  living: LIVING,
  kitchen: KITCHEN,
  bathroom: BATHROOM,
  "bedroom-1": BEDROOM,
  "bedroom-2": BEDROOM_2,
  bedroom: BEDROOM,
};

/** Curated starter layout per room — no legacy demo packs */
export function getDefaultIsoRoomItems(roomId: string, roomType: string): BondeePlacedItem[] {
  return (BY_ROOM[roomId] ?? BY_ROOM[roomType] ?? []).map((i) => ({ ...i, roomId }));
}

export function mergeIsoLayout(
  saved: BondeePlacedItem[],
  roomIds: string[],
  roomTypes: Map<string, string>
): BondeePlacedItem[] {
  const merged: BondeePlacedItem[] = [];
  for (const roomId of roomIds) {
    const roomItems = saved.filter((i) => i.roomId === roomId);
    if (roomItems.length > 0) {
      merged.push(...roomItems);
    } else {
      const type = roomTypes.get(roomId) ?? roomId;
      merged.push(...getDefaultIsoRoomItems(roomId, type));
    }
  }
  return merged;
}
