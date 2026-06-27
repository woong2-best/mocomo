import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(path.join(root, "../src/lib/diorama/living-room-preset.ts")).href);
const preset = mod.LIVING_ROOM_DIORAMA;
const { STICKER_CATALOG } = await import(pathToFileURL(path.join(root, "../src/lib/diorama/sticker-catalog.ts")).href);

const assets = Object.fromEntries(Object.values(STICKER_CATALOG).map((a) => [a.id, a.defaultWidth]));

fs.writeFileSync(
  path.join(root, "../public/diorama/living-preset.json"),
  JSON.stringify({ backdropAssetId: preset.backdropAssetId, assets, stickers: preset.stickers }, null, 2)
);
console.log("Exported", preset.stickers.length, "stickers");
