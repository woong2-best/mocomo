/**
 * Reverse-engineer floor lamp from reference mockup crop.
 * Output: public/apt/corner-sample/floor-lamp/shape-analysis.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, "../../public/apt/reference/apt-target-mockup.png");
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/floor-lamp");

const CROP = { left: 20, top: 248, width: 42, height: 58 };

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
      const glow = lum > 185 && r > 170 && g > 155 && b > 130;
      const pole = lum > 40 && lum < 130 && r < 110 && g < 95;
      const base = lum > 55 && lum < 150 && r > 80 && g < 110 && b < 110;
      const hit = glow || pole || base;
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
    counts: {},
    meters: {},
    silhouetteTraits: [
      "Slim pole + rounded fabric shade (reference glow)",
      "Overall H 1550mm — balanced with sofa, not dominant",
      "Disk base Ø280mm, low profile",
      "Warm simple silhouette — atmosphere lighting object",
      "No emissive/lighting in Shape stage",
    ],
  };
}

function toMeters(analysis) {
  // Style Lock CS-06 authoritative
  analysis.meters = {
    overallHeight: 1.55,
    overallWidth: 0.36,
    overallDepth: 0.36,
    baseDiameter: 0.28,
    baseHeight: 0.025,
    poleRadius: 0.009,
    shadeHeight: 0.28,
    shadeTopRadius: 0.12,
    shadeBottomRadius: 0.18,
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
  scaleAnchor: "1.55m overall height (APT_STYLE_LOCK CS-06)",
  camera: { type: "orthographic", elevationDeg: 35, azimuthDeg: 45 },
  notes: "Style Lock dims authoritative; glow excluded from mesh (Lighting Pass)",
};

analysis.lampShapeAnalysis = {
  overallHeight: analysis.meters.overallHeight,
  baseDiameter: analysis.meters.baseDiameter,
  shadeBottomRadius: analysis.meters.shadeBottomRadius,
  poleRadius: analysis.meters.poleRadius,
  silhouetteTraits: analysis.silhouetteTraits,
};

fs.writeFileSync(path.join(OUT_DIR, "shape-analysis.json"), JSON.stringify(analysis, null, 2));
console.log("Wrote shape-analysis.json");
console.log(JSON.stringify(analysis.lampShapeAnalysis, null, 2));
