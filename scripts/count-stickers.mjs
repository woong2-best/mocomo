import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Minimal re-export for script — duplicate count from preset file
const presetPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/diorama/living-room-preset.ts");
const text = fs.readFileSync(presetPath, "utf8");
const count = (text.match(/s\("/g) || []).length;
console.log("Sticker placements:", count);
