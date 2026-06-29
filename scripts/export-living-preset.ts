import fs from "fs";
import path from "path";
import { LIVING_ROOM_DIORAMA } from "../src/lib/diorama/living-room-preset";
import { LIVING_CORNER_ZONES, LIVING_ROOM_STYLE_VERSION } from "../src/lib/diorama/living-room-style-lock";
import { STICKER_CATALOG } from "../src/lib/diorama/sticker-catalog";

const assets = Object.fromEntries(Object.values(STICKER_CATALOG).map((a) => [a.id, a.defaultWidth]));
const out = path.join(import.meta.dirname, "../public/diorama/living-preset.json");
const stickers = LIVING_ROOM_DIORAMA.defaultInstances.map((s) => ({
  id: s.id,
  assetId: s.typeId,
  x: s.x,
  y: s.y,
  zIndex: s.zIndex,
  scale: s.scale ?? 1,
  rotation: s.rotation ?? 0,
  linkTo: s.linkTo,
  draggable: s.draggable,
}));
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      version: LIVING_ROOM_STYLE_VERSION,
      backdropAssetId: LIVING_ROOM_DIORAMA.backdropAssetId,
      corners: LIVING_CORNER_ZONES,
      assets,
      stickers,
    },
    null,
    2
  )
);
console.log("Exported", stickers.length, "stickers");
