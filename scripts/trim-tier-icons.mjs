/**
 * Tier badge PNGs — flood-fill remove white/black/checkerboard, trim to badge.
 *
 *   node scripts/trim-tier-icons.mjs
 *   node scripts/trim-tier-icons.mjs --import <input.png> <outputName.png>
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public/support/tier-art");
const TOL = 42;
const OUT_SIZE = 512;

function dist(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function matchesBg(r, g, b, bgColors) {
  for (const c of bgColors) {
    if (dist([r, g, b], c) <= TOL) return true;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (min >= 230) return true;
  if (max <= 28) return true;
  return false;
}

function floodClear(data, w, h) {
  const samples = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];
  const bgColors = samples.map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });

  const visited = new Uint8Array(w * h);
  const queue = [];

  for (let x = 0; x < w; x++) {
    queue.push([x, 0], [x, h - 1]);
  }
  for (let y = 0; y < h; y++) {
    queue.push([0, y], [w - 1, y]);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!matchesBg(r, g, b, bgColors)) continue;
    data[i + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

async function processBufferToFile(inputBuffer, filePath) {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  floodClear(out, info.width, info.height);

  const trimmed = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .resize(OUT_SIZE, OUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  await sharp(trimmed).toFile(filePath);
  const meta = await sharp(filePath).metadata();
  return {
    file: path.basename(filePath),
    w: meta.width,
    h: meta.height,
    bytes: fs.statSync(filePath).size,
  };
}

async function processFile(filePath) {
  return processBufferToFile(fs.readFileSync(filePath), filePath);
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  const importIdx = process.argv.indexOf("--import");
  if (importIdx >= 0) {
    const inputPath = process.argv[importIdx + 1];
    const outName = process.argv[importIdx + 2];
    if (!inputPath || !outName?.endsWith(".png")) {
      console.error("Usage: node scripts/trim-tier-icons.mjs --import <input.png> <name.png>");
      process.exit(1);
    }
    const outPath = path.join(DIR, outName);
    const result = await processBufferToFile(fs.readFileSync(inputPath), outPath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
  const results = [];
  for (const file of files) {
    results.push(await processFile(path.join(DIR, file)));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
