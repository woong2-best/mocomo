/**
 * 스티커 PNG → 투명 WebP 변환
 * 코너 flood-fill: 흰 배경 · AI 체커보드 · 검은 배경 제거, trim, WebP
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const STICKER_DIR = path.resolve("public/diorama/stickers/living");

function isBg(r, g, b, a) {
  if (a < 8) return true;

  const avg = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);

  // 순수 검은 배경 (plant 등)
  if (avg < 18 && spread < 20) return true;

  // 흰 배경
  if (r >= 248 && g >= 248 && b >= 248) return true;

  // AI 가짜 투명 체커보드 (회색·밝은 회색, 저채도)
  if (spread < 14) {
    if (avg >= 235) return true;
    if (avg >= 175 && avg <= 234) return true; // #ccc ~ #eee
    if (avg >= 115 && avg <= 175) return true; // #808 ~ #aaa
  }

  return false;
}

function floodFillAlpha(data, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];

  const seed = (x, y) => {
    const i = (y * w + x) * 4;
    if (isBg(data[i], data[i + 1], data[i + 2], data[i + 3])) queue.push([x, y]);
  };

  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    const idx = y * w + x;
    if (x < 0 || x >= w || y < 0 || y >= h || visited[idx]) continue;
    const i = idx * 4;
    if (!isBg(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    visited[idx] = 1;
    data[i + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // 배경과 접한 흰 halo 제거 (스티커 테두리는 유지)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      if (data[i + 3] === 0) continue;
      const touchesBg = [visited[idx - 1], visited[idx + 1], visited[idx - w], visited[idx + w]].some(Boolean);
      if (touchesBg && data[i] > 210 && data[i + 1] > 210 && data[i + 2] > 210) {
        data[i + 3] = Math.min(data[i + 3], 160);
      }
    }
  }
}

async function processFile(name) {
  const pngPath = path.join(STICKER_DIR, name);
  const webpPath = path.join(STICKER_DIR, name.replace(/\.png$/i, ".webp"));
  if (!fs.existsSync(pngPath)) return null;

  const img = sharp(pngPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  floodFillAlpha(pixels, info.width, info.height);

  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(webpPath);

  return webpPath;
}

const files = fs.readdirSync(STICKER_DIR).filter((f) => f.endsWith(".png"));
let ok = 0;
for (const f of files) {
  try {
    await processFile(f);
    ok++;
    console.log("ok", f);
  } catch (e) {
    console.error("fail", f, e.message);
  }
}
console.log(`Done: ${ok}/${files.length}`);
