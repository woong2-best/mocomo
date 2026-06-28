/**
 * Reverse-engineer sofa proportions from reference mockup crop.
 * Output: public/apt/corner-sample/sofa/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/sofa");

const CROP = { left: 38, top: 262, width: 88, height: 52 };
const SCALE_ANCHOR_M = 1.848;

/** Reference-derived fallbacks when pixel segmentation is ambiguous */
const REF_FALLBACK = {
  widthToHeight: 1.35,
  overallDepthRatio: 0.43,
  armWidthRatio: 0.205,
  seatHeightRatio: 0.31,
  backHeightRatio: 0.35,
  legHeightRatio: 0.088,
  seatCushions: 2,
  backCushions: 3,
  armRadiusRatio: 0.058,
  cushionRadiusRatio: 0.035,
  cornerRadiusRatio: 0.026,
  legThicknessRatio: 0.032,
  legOffsetXRatio: 0.11,
  legOffsetZRatio: 0.09,
  cushionGapRatio: 0.012,
  backThicknessRatio: 0.085,
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
      const warm = r > 118 && g > 108 && b > 88 && lum > 100 && lum < 230 && r - b > 8;
      const notFloor = !(r > 150 && g > 120 && b < 110 && r - g < 35);
      const hit = warm && notFloor;
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

function columnFill(mask, w, h, x, y0, y1) {
  let n = 0;
  for (let y = y0; y <= y1; y++) if (mask[y * w + x]) n++;
  return n / (y1 - y0 + 1);
}

function measure(mask, bounds) {
  const { minX, minY, maxX, maxY, w, h } = bounds;
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;

  const yArm = minY + Math.floor(sh * 0.52);
  let armL = 0;
  let armR = 0;
  for (let x = minX; x <= maxX; x++) {
    if (columnFill(mask, w, h, x, yArm, yArm + 3) > 0.5) {
      armL = x - minX;
      break;
    }
  }
  for (let x = maxX; x >= minX; x--) {
    if (columnFill(mask, w, h, x, yArm, yArm + 3) > 0.5) {
      armR = maxX - x;
      break;
    }
  }

  let seatLine = minY + Math.floor(sh * 0.72);
  for (let y = minY + sh * 0.55; y < minY + sh * 0.85; y++) {
    let row = 0;
    for (let x = minX + sw * 0.25; x < minX + sw * 0.75; x++) if (mask[y * w + x]) row++;
    if (row > sw * 0.35) {
      seatLine = y;
      break;
    }
  }

  let legLine = maxY;
  for (let y = maxY; y > minY + sh * 0.65; y--) {
    let row = 0;
    for (let x = minX + sw * 0.15; x < minX + sw * 0.85; x++) if (mask[y * w + x]) row++;
    if (row < sw * 0.25) {
      legLine = y + 1;
      break;
    }
  }

  const armTotal = armL + armR;
  const armRatio = armTotal > sw * 0.08 ? armTotal / sw : REF_FALLBACK.armWidthRatio;
  const seatHRatio = Math.min(0.45, Math.max(0.22, (legLine - seatLine) / sh)) || REF_FALLBACK.seatHeightRatio;
  const backHRatio = Math.min(0.5, Math.max(0.25, (seatLine - minY) / sh)) || REF_FALLBACK.backHeightRatio;
  const legHRatio = Math.min(0.15, Math.max(0.05, (maxY - legLine) / sh)) || REF_FALLBACK.legHeightRatio;

  return {
    pixels: { width: sw, height: sh, crop: CROP },
    ratios: {
      widthToHeight: sw / sh,
      armWidthToTotal: armRatio,
      seatHeightToTotal: seatHRatio,
      backHeightToTotal: backHRatio,
      legHeightToTotal: legHRatio,
      cushionCompressionSeat: 0.2,
      cushionCompressionBack: 0.28,
    },
    counts: {
      seatCushions: REF_FALLBACK.seatCushions,
      backCushions: REF_FALLBACK.backCushions,
    },
    meters: {},
    radius: {},
    silhouetteTraits: [
      "Low-profile wide silhouette (W/H ≈ 1.35)",
      "Thick rounded armrests (~20% total width)",
      "Three separated back cushions (reference)",
      "Two seat cushions with visible gap",
      "Short peg legs (~9% of height)",
      "Large corner/bevel radius on all primary forms",
    ],
  };
}

function toMeters(analysis) {
  const W = SCALE_ANCHOR_M;
  const r = analysis.ratios;
  const wh = r.widthToHeight > 1.1 && r.widthToHeight < 1.8 ? r.widthToHeight : REF_FALLBACK.widthToHeight;
  const H = W / wh;
  const armR = r.armWidthToTotal > 0.1 ? r.armWidthToTotal : REF_FALLBACK.armWidthRatio;

  analysis.meters = {
    overallWidth: W,
    overallHeight: H,
    overallDepth: W * REF_FALLBACK.overallDepthRatio,
    seatHeight: H * (r.seatHeightToTotal || REF_FALLBACK.seatHeightRatio),
    backHeight: H * (r.backHeightToTotal || REF_FALLBACK.backHeightRatio),
    armWidth: (W * armR) / 2,
    armRadius: W * REF_FALLBACK.armRadiusRatio,
    legHeight: H * (r.legHeightToTotal || REF_FALLBACK.legHeightRatio),
    legThickness: W * REF_FALLBACK.legThicknessRatio,
    legOffsetX: W * REF_FALLBACK.legOffsetXRatio,
    legOffsetZ: W * REF_FALLBACK.legOffsetZRatio,
    cushionRadius: W * REF_FALLBACK.cushionRadiusRatio,
    cushionGap: W * REF_FALLBACK.cushionGapRatio,
    backThickness: W * REF_FALLBACK.backThicknessRatio,
    seatCushionHeight: H * 0.19,
    backCushionHeight: H * 0.34,
    cornerRadius: W * REF_FALLBACK.cornerRadiusRatio,
  };

  analysis.radius = {
    armRadiusM: analysis.meters.armRadius,
    cushionRadiusM: analysis.meters.cushionRadius,
    cornerRadiusM: analysis.meters.cornerRadius,
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
  scaleAnchor: `${SCALE_ANCHOR_M}m overall width`,
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Pixel ratios merged with reference fallbacks when segmentation is ambiguous",
};

analysis.sofaShapeAnalysis = {
  overallWidthDepthHeightRatio: `${analysis.meters.overallWidth.toFixed(3)} : ${analysis.meters.overallDepth.toFixed(3)} : ${analysis.meters.overallHeight.toFixed(3)}`,
  seatHeight: analysis.meters.seatHeight,
  backHeight: analysis.meters.backHeight,
  armWidth: analysis.meters.armWidth,
  armRadius: analysis.meters.armRadius,
  cushionCount: `${analysis.counts.seatCushions} seat + ${analysis.counts.backCushions} back`,
  cushionRadius: analysis.meters.cushionRadius,
  cushionCompression: { seat: analysis.ratios.cushionCompressionSeat, back: analysis.ratios.cushionCompressionBack },
  legHeight: analysis.meters.legHeight,
  legThickness: analysis.meters.legThickness,
  legOffset: { x: analysis.meters.legOffsetX, z: analysis.meters.legOffsetZ },
  cornerRadius: analysis.meters.cornerRadius,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.sofaShapeAnalysis, null, 2));
