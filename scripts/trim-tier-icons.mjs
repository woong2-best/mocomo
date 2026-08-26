/**
 * Tier badge PNGs — flood-fill remove white/black/checkerboard, trim to badge.
 * npx tsx scripts/trim-tier-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public/support/tiers");
const TOL = 42;

function dist(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function matchesBg(r, g, b, bgColors) {
  for (const c of bgColors) {
    if (dist([r, g, b], c) <= TOL) return true;
  }
  // generic near-white / near-black fallback
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

async function processFile(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  floodClear(out, info.width, info.height);

  const trimmed = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
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

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
const results = [];
for (const file of files) {
  results.push(await processFile(path.join(DIR, file)));
}
console.log(JSON.stringify(results, null, 2));
