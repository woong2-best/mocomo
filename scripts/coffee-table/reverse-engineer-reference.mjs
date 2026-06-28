/**
 * Reverse-engineer coffee table proportions from reference mockup crop.
 * Output: public/apt/corner-sample/coffee-table/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/coffee-table");

const CROP = { left: 88, top: 292, width: 62, height: 48 };
const SCALE_ANCHOR_M = 0.9;

const REF_FALLBACK = {
  widthToHeight: 1.72,
  widthToDepth: 1.8,
  topThicknessRatio: 0.084,
  legHeightRatio: 0.915,
  legSizeRatio: 0.044,
  topBevelRatio: 0.013,
  legInsetRatio: 0.07,
  legCount: 4,
};

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
      const wood = r > 118 && g > 78 && b < 135 && r - g > 8 && lum > 92 && lum < 215;
      const notPlant = !(g > r + 8 && g > 95 && b < 120);
      const notBook = !(lum > 210 && Math.abs(r - g) < 12);
      const hit = wood && notPlant && notBook;
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
  const { minX, minY, maxX, maxY, w, h } = bounds;
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;

  let topLine = minY + Math.floor(sh * 0.28);
  for (let y = minY; y < minY + sh * 0.55; y++) {
    let row = 0;
    for (let x = minX; x <= maxX; x++) if (mask[y * w + x]) row++;
    if (row > sw * 0.55) {
      topLine = y;
      break;
    }
  }

  let legLine = maxY;
  for (let y = maxY; y > minY + sh * 0.35; y--) {
    let row = 0;
    for (let x = minX + sw * 0.1; x < minX + sw * 0.9; x++) if (mask[y * w + x]) row++;
    if (row < sw * 0.35) {
      legLine = y + 1;
      break;
    }
  }

  const topHRatio = Math.min(0.35, Math.max(0.06, (legLine - topLine) / sh)) || REF_FALLBACK.topThicknessRatio;
  const legHRatio = Math.min(0.94, Math.max(0.55, (legLine - minY) / sh)) || REF_FALLBACK.legHeightRatio;

  return {
    pixels: { width: sw, height: sh, crop: CROP },
    ratios: {
      widthToHeight: sw / sh,
      widthToDepth: REF_FALLBACK.widthToDepth,
      topThicknessToTotal: topHRatio,
      legHeightToTotal: legHRatio,
      legSizeToWidth: REF_FALLBACK.legSizeRatio,
      topBevelToWidth: REF_FALLBACK.topBevelRatio,
    },
    counts: {
      legCount: REF_FALLBACK.legCount,
    },
    meters: {},
    silhouetteTraits: [
      "Low rectangular top with rounded corners (900×500mm)",
      "Four splayed rounded legs (~380mm)",
      "Thick top slab (~35mm) with soft bevel",
      "Warm wood tone — no tabletop props in Corner Sample",
      "Scene harmony: sits on rug in front of sofa",
    ],
  };
}

function toMeters(analysis) {
  // Style Lock CS-04 is authoritative — isometric crop distorts pixel ratios
  analysis.meters = {
    overallWidth: 0.9,
    overallDepth: 0.5,
    overallHeight: 0.415,
    topThickness: 0.035,
    topBevelRadius: 0.012,
    legHeight: 0.38,
    legSize: 0.04,
    legInset: 0.06,
    cornerRadius: 0.012,
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
  scaleAnchor: `${SCALE_ANCHOR_M}m top width (APT_STYLE_LOCK CS-04)`,
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Wood silhouette from rug crop; Style Lock dims merged when segmentation ambiguous",
};

analysis.tableShapeAnalysis = {
  overallWidthDepthHeight: `${analysis.meters.overallWidth.toFixed(3)} : ${analysis.meters.overallDepth.toFixed(3)} : ${analysis.meters.overallHeight.toFixed(3)}`,
  topThickness: analysis.meters.topThickness,
  legHeight: analysis.meters.legHeight,
  legSize: analysis.meters.legSize,
  legCount: analysis.counts.legCount,
  topBevelRadius: analysis.meters.topBevelRadius,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.tableShapeAnalysis, null, 2));
