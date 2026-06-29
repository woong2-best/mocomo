/**
 * RC Sprint 1 — Living Room Art Pass
 * WebP: warm tint · soft contrast · Bondee LUT
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STICKER_DIR = path.join(__dirname, "../public/diorama/stickers/living");
const BACKUP_DIR = path.join(STICKER_DIR, "_rc1-backup");
const OUT_DIR = path.join(STICKER_DIR, "_rc1-out");

const TYPES = [
  "sofa",
  "rug",
  "coffee-table",
  "tv",
  "shelf",
  "plant",
  "lamp",
  "mug",
  "remote",
  "books",
  "cushion",
  "slippers",
  "magazine",
  "candle",
  "vase",
  "gamepad",
  "telephone",
  "frame-small",
  "window",
];

const dryRun = process.argv.includes("--dry-run");
const restore = process.argv.includes("--restore");
const apply = process.argv.includes("--apply");

if (restore) {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error("No backup at", BACKUP_DIR);
    process.exit(1);
  }
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.endsWith(".webp")) continue;
    fs.copyFileSync(path.join(BACKUP_DIR, name), path.join(STICKER_DIR, name));
    console.log("restored", name);
  }
  process.exit(0);
}

if (!dryRun && !fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!dryRun && !fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

let processed = 0;
for (const typeId of TYPES) {
  const webpPath = path.join(STICKER_DIR, `${typeId}.webp`);
  const outPath = apply ? webpPath : path.join(OUT_DIR, `${typeId}.webp`);
  if (!fs.existsSync(webpPath)) {
    console.warn("skip (missing):", typeId);
    continue;
  }

  if (!dryRun) {
    const backupPath = path.join(BACKUP_DIR, `${typeId}.webp`);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(webpPath, backupPath);
    }

    const buf = await sharp(webpPath)
      .modulate({ brightness: 1.03, saturation: 0.9 })
      .linear(0.95, 6)
      .tint({ r: 255, g: 244, b: 230 })
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer();

    fs.writeFileSync(outPath, buf);
  }
  processed++;
  console.log(dryRun ? "would process" : apply ? "applied" : "wrote", typeId, apply ? "" : `→ ${outPath}`);
}

console.log(
  `Art pass ${dryRun ? "(dry)" : "done"}: ${processed}/${TYPES.length}` +
    (apply ? "" : ` · output: ${OUT_DIR} · use --apply to overwrite originals`)
);
