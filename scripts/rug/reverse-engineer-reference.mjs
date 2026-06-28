/**
 * Reverse-engineer rug proportions from reference mockup crop.
 * Output: public/apt/corner-sample/rug/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/rug");

const CROP = { left: 30, top: 275, width: 130, height: 80 };

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
      const rug =
        lum > 150 &&
        lum < 238 &&
        r > 145 &&
        g > 130 &&
        b > 115 &&
        Math.abs(r - g) < 28 &&
        !(r > 125 && g > 78 && b < 135 && r - g > 12);
      const hit = rug;
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
      widthToDepth: sw / Math.max(sh, 1),
    },
    counts: {},
    meters: {},
    silhouetteTraits: [
      "Large rounded-rect rug under sofa + coffee table",
      "Soft cream pile texture (reference)",
      "Low profile — 12mm elevation above floor",
      "No hard fringe; soft edge bevel",
      "Scene anchor — ties seating area together",
    ],
  };
}

function toMeters(analysis) {
  // Style Lock CS-03 authoritative
  analysis.meters = {
    overallWidth: 1.8,
    overallDepth: 1.45,
    overallHeight: 0.012,
    edgeBevelRadius: 0.006,
    cornerRadius: 0.14,
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
  scaleAnchor: "1.8m width (APT_STYLE_LOCK CS-03)",
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Style Lock dims authoritative; crop includes furniture for scene context",
};

analysis.rugShapeAnalysis = {
  overallWidthDepthThickness: `${analysis.meters.overallWidth.toFixed(3)} : ${analysis.meters.overallDepth.toFixed(3)} : ${analysis.meters.overallHeight.toFixed(3)}`,
  edgeBevelRadius: analysis.meters.edgeBevelRadius,
  cornerRadius: analysis.meters.cornerRadius,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.rugShapeAnalysis, null, 2));
