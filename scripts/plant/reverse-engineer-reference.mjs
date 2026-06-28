/**
 * Reverse-engineer floor plant from reference mockup crop.
 * Output: public/apt/corner-sample/plant/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/plant");

const CROP = { left: 12, top: 265, width: 50, height: 60 };

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
      const leaf = g > r + 4 && g > 88 && g < 195 && b < 135 && lum > 75;
      const pot = lum > 35 && lum < 120 && r > 40 && g < 95 && b < 95;
      const lamp = lum > 200 && Math.abs(r - g) < 20;
      const hit = (leaf || pot) && !lamp;
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
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;

  return {
    pixels: { width: sw, height: sh, crop: CROP },
    ratios: {
      widthToHeight: sw / Math.max(sh, 1),
    },
    counts: {
      leafCount: 7,
    },
    meters: {},
    silhouetteTraits: [
      "Floor plant — pot H 320mm, modest footprint",
      "7 simple rounded leaves (5~9 range)",
      "Warm soft silhouette — secondary to sofa",
      "Terracotta pot + green foliage (graybox shape)",
      "Atmosphere accent, not focal hero",
    ],
  };
}

function toMeters(analysis) {
  // Style Lock CS-05 authoritative
  analysis.meters = {
    overallWidth: 0.24,
    overallDepth: 0.22,
    overallHeight: 0.56,
    potHeight: 0.32,
    potTopRadius: 0.095,
    potBottomRadius: 0.082,
    foliageHeight: 0.26,
    foliageSpread: 0.22,
    leafLength: 0.115,
    leafWidth: 0.072,
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
  scaleAnchor: "pot 0.32m height (APT_STYLE_LOCK CS-05)",
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Floor plant at sofa corner; Style Lock dims authoritative",
};

analysis.plantShapeAnalysis = {
  overallWidthDepthHeight: `${analysis.meters.overallWidth.toFixed(3)} : ${analysis.meters.overallDepth.toFixed(3)} : ${analysis.meters.overallHeight.toFixed(3)}`,
  potHeight: analysis.meters.potHeight,
  foliageSpread: analysis.meters.foliageSpread,
  leafCount: analysis.counts.leafCount,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.plantShapeAnalysis, null, 2));
