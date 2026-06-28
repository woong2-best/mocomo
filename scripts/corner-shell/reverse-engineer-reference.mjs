/**
 * Reverse-engineer corner shell from reference living-room crop.
 * Output: public/apt/corner-sample/corner-shell/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/corner-shell");

const CROP = { left: 25, top: 245, width: 175, height: 95 };

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function extractSilhouette(raw, w, h) {
  const mask = new Uint8Array(w * h);
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      const lum = luminance(r, g, b);
      const wall = lum > 175 && lum < 252 && Math.abs(r - g) < 25;
      const floor = lum > 100 && lum < 200 && r > 120 && g > 95 && b < 130;
      const hit = wall || floor;
      mask[y * w + x] = hit ? 1 : 0;
      if (hit) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { mask, bounds: { minX, minY, maxX, maxY, w, h } };
}

function measure(mask, bounds) {
  const { minX, minY, maxX, maxY } = bounds;
  return {
    pixels: { width: maxX - minX + 1, height: maxY - minY + 1, crop: CROP },
    ratios: { widthToDepth: (maxX - minX + 1) / Math.max(maxY - minY + 1, 1) },
    counts: { wallCount: 2, windowCount: 1 },
    meters: {},
    silhouetteTraits: [
      "L-corner shell — 2 walls + cutaway dollhouse view",
      "Floor 3200×2800mm oak plank (graybox)",
      "Wall H 2500mm, thickness 150mm",
      "Left wall window recess 200mm",
      "Baseboard H 90mm — atmosphere frame",
      "Cutaway open edges + top cap silhouette",
    ],
  };
}

function toMeters(analysis) {
  analysis.meters = {
    floorWidth: 3.2,
    floorDepth: 2.8,
    floorThickness: 0.02,
    wallHeight: 2.5,
    wallThickness: 0.15,
    baseboardHeight: 0.09,
    baseboardProjection: 0.012,
    windowRecess: 0.2,
    windowWidth: 1.15,
    windowHeight: 1.05,
    windowSillY: 0.55,
    cutawayCapHeight: 0.04,
    overallWidth: 3.2,
    overallDepth: 2.8,
    overallHeight: 2.5,
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const cropBuf = await sharp(REF).extract(CROP).png().toBuffer();
await sharp(cropBuf).toFile(path.join(OUT_DIR, "reference-crop.png"));

const { data, info } = await sharp(cropBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { mask, bounds } = extractSilhouette(data, info.width, info.height);

const sil = Buffer.alloc(info.width * info.height * 4, 0);
for (let i = 0; i < mask.length; i++) {
  const o = i * 4;
  if (mask[i]) {
    sil[o] = 30;
    sil[o + 1] = 30;
    sil[o + 2] = 30;
    sil[o + 3] = 255;
  }
}
await sharp(sil, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(path.join(OUT_DIR, "reference-silhouette.png"));

const analysis = measure(mask, bounds);
toMeters(analysis);

analysis.meta = {
  method: "reverse-engineering",
  source: "public/apt/reference/apt-target-mockup.png",
  crop: CROP,
  scaleAnchor: "APT_STYLE_LOCK CS-01 floor 3.2×2.8m",
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Style Lock authoritative; shell sets space atmosphere frame",
};

analysis.shellShapeAnalysis = {
  floor: `${analysis.meters.floorWidth} × ${analysis.meters.floorDepth} m`,
  walls: `H ${analysis.meters.wallHeight}m · T ${analysis.meters.wallThickness}m · L-corner`,
  window: `recess ${analysis.meters.windowRecess}m on left wall`,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.shellShapeAnalysis, null, 2));
