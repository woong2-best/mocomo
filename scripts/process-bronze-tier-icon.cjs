/**
 * Bronze tier icon — JPEG/black bg → transparent circular PNG
 * Usage: node scripts/process-bronze-tier-icon.cjs [inputPath]
 */
const sharp = require("sharp");
const path = require("path");

const input =
  process.argv[2] ||
  "C:/Users/백권웅/.cursor/projects/c-dev-mocomo/assets/c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_e9dfW-037ac09c-d764-467d-8104-37e89f181374.png";
const output = path.join(__dirname, "../public/support/tiers/bronze.png");
const SIZE = 512;

async function main() {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = out[o];
    const g = out[o + 1];
    const b = out[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    // Remove black/near-black square background
    if (max < 28) {
      out[o + 3] = 0;
      continue;
    }

    // Soft feather on dark edge pixels (anti-aliased circle border)
    if (max < 55 && min < 20) {
      out[o + 3] = Math.min(out[o + 3], Math.round(((max - 20) / 35) * 255));
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 10 })
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);

  const meta = await sharp(output).metadata();
  console.log(`✅ ${output} — ${meta.width}x${meta.height} ${meta.format} alpha=${meta.hasAlpha}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
