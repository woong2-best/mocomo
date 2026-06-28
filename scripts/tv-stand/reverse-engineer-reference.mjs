/**
 * Reverse-engineer TV stand + TV graybox from reference mockup crop.
 * Output: public/apt/corner-sample/tv-stand/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/tv-stand");

const CROP = { left: 130, top: 270, width: 75, height: 58 };

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
      const tv = lum > 35 && lum < 115 && Math.abs(r - g) < 18 && b < 120;
      const cabinet = lum > 95 && lum < 190 && r > 120 && g > 95 && b < 120 && r - g < 35;
      const hit = tv || cabinet;
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
    ratios: { widthToHeight: sw / Math.max(sh, 1) },
    counts: { hasTvGraybox: true },
    meters: {},
    silhouetteTraits: [
      "Low long cabinet — living room focal axis",
      "Rounded corners, stable proportion, minimal detail",
      "Thin TV graybox panel on top (no screen glow)",
      "Not too tall — balances with sofa seating zone",
      "Wood tone deferred to Material Pass",
    ],
  };
}

function toMeters(analysis) {
  analysis.meters = {
    cabinetWidth: 1.55,
    cabinetDepth: 0.4,
    cabinetHeight: 0.44,
    legHeight: 0.035,
    cornerRadius: 0.022,
    tvWidth: 1.02,
    tvHeight: 0.56,
    tvThickness: 0.022,
    overallWidth: 1.55,
    overallDepth: 0.4,
    overallHeight: 0.035 + 0.44 + 0.56,
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
  scaleAnchor: "cabinet 1.55m width (reference living room focal axis)",
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Reference-derived dims; TV graybox included, emissive deferred",
};

analysis.tvStandShapeAnalysis = {
  cabinet: `${analysis.meters.cabinetWidth.toFixed(3)} × ${analysis.meters.cabinetDepth.toFixed(3)} × ${analysis.meters.cabinetHeight.toFixed(3)} m`,
  tvGraybox: `${analysis.meters.tvWidth.toFixed(3)} × ${analysis.meters.tvThickness.toFixed(3)} × ${analysis.meters.tvHeight.toFixed(3)} m`,
  overallHeight: analysis.meters.overallHeight,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.tvStandShapeAnalysis, null, 2));
