import type { StickerAssetDef } from "./sticker-types";

export type GameFurnitureTabId = "sofa" | "table" | "chair" | "decor";

export const GAME_FURNITURE_TABS: { id: GameFurnitureTabId; label: string }[] = [
  { id: "sofa", label: "소파" },
  { id: "table", label: "테이블" },
  { id: "chair", label: "의자" },
  { id: "decor", label: "장식" },
];

const SOFA_IDS = new Set(["sofa", "cushion", "bed", "wardrobe", "rug"]);
const TABLE_IDS = new Set([
  "coffee-table",
  "desk",
  "shelf",
  "bookshelf",
  "tv",
  "gamepad",
  "remote",
]);
const CHAIR_IDS = new Set(["chair", "slippers"]);

export function filterAssetsForGameTab(
  assets: StickerAssetDef[],
  tab: GameFurnitureTabId
): StickerAssetDef[] {
  return assets.filter((a) => {
    if (a.id === "room-shell") return false;
    switch (tab) {
      case "sofa":
        return SOFA_IDS.has(a.id) || (a.category === "furniture" && !TABLE_IDS.has(a.id) && !CHAIR_IDS.has(a.id));
      case "table":
        return TABLE_IDS.has(a.id);
      case "chair":
        return CHAIR_IDS.has(a.id);
      case "decor":
        return a.category === "decor" || a.category === "prop" || a.category === "lighting";
      default:
        return true;
    }
  });
}
