import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = resolve(
  "C:/Users/백권웅/.cursor/projects/c-dev-mocomo/assets"
);
const OUT = resolve(ROOT, "apps/mobile/assets");

/**
 * Hero login background — byte-for-byte copy of the source art.
 * Do not resize / filter / recompress (keeps original quality).
 */
const BG_SRC = resolve(
  ASSETS,
  "c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260915_222803531-ede957cd-80cf-4470-b0d5-63c6f50a9806.png"
);
const BG_DEST = resolve(OUT, "welcome-bg.jpg");

mkdirSync(OUT, { recursive: true });
copyFileSync(BG_SRC, BG_DEST);

const meta = await sharp(BG_DEST).metadata();
console.log(
  `${BG_DEST} -> ${meta.width}x${meta.height} ${meta.format} (copied, no re-encode)`
);
