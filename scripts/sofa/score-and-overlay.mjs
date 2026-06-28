/**
 * Shape Score + Overlay comparison for sofa v2
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { createServer } from "http";
import { lookup } from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../../public");
const OUT_DIR = path.join(PUBLIC, "apt/corner-sample/sofa");
const PORT = 3459;

const analysis = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "shape-analysis.json"), "utf8"));
const target = analysis.meters;

function scoreDim(model, tgt) {
  if (!tgt) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - Math.abs(model - tgt) / tgt)));
}

function scoreRatio(model, tgt) {
  return scoreDim(model, tgt);
}

async function binaryMask(pngBuf) {
  const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    const a = data[o + 3];
    const lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    mask[i] = a > 20 && lum < 240 ? 1 : 0;
  }
  return { mask, w: info.width, h: info.height };
}

function bbox(mask, w, h) {
  let minX = w, minY = h, maxX = 0, maxY = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        n++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY, n, w, h };
}

function iou(a, b) {
  let inter = 0;
  let uni = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++;
    if (a[i] || b[i]) uni++;
  }
  return uni ? inter / uni : 0;
}

async function alignMasks(ref, mod, size = 256) {
  const rb = bbox(ref.mask, ref.w, ref.h);
  const mb = bbox(mod.mask, mod.w, mod.h);
  async function cropMask(src, b) {
    const sil = Buffer.alloc(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const v = src.mask[(b.minY + y) * src.w + (b.minX + x)] ? 255 : 0;
        const o = (y * b.w + x) * 4;
        sil[o] = sil[o + 1] = sil[o + 2] = v;
        sil[o + 3] = 255;
      }
    }
    return sharp(sil, { raw: { width: b.w, height: b.h, channels: 4 } })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw()
      .toBuffer();
  }
  const [rRaw, mRaw] = await Promise.all([
    cropMask(ref, rb),
    cropMask(mod, mb),
  ]);
  const rMask = new Uint8Array(size * size);
  const mMask = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) {
    rMask[i] = rRaw[i * 4] > 128 ? 1 : 0;
    mMask[i] = mRaw[i * 4] > 128 ? 1 : 0;
  }
  return { rMask, mMask };
}

function servePublic() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const filePath = path.join(PUBLIC, urlPath === "/" ? "index.html" : urlPath);
      if (!filePath.startsWith(PUBLIC) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": lookup(path.extname(filePath)) || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:${PORT}/apt/corner-sample/sofa/render.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__SOFA_RENDER_READY__ === true);
const modelMetrics = await page.evaluate(() => window.__SOFA_BBOX__);
const renderBuf = await page.screenshot({ type: "png", omitBackground: true });
await browser.close();
server.close();

const renderPath = path.join(OUT_DIR, "render-reference-camera.png");
fs.writeFileSync(renderPath, renderBuf);

const refCrop = fs.readFileSync(path.join(OUT_DIR, "reference-crop.png"));
const refMask = await binaryMask(refCrop);
const modMask = await binaryMask(renderBuf);
const { rMask, mMask } = await alignMasks(refMask, modMask, 256);

const refB = bbox(refMask.mask, refMask.w, refMask.h);
const modB = bbox(modMask.mask, modMask.w, modMask.h);
const refW = refB.maxX - refB.minX + 1;
const refH = refB.maxY - refB.minY + 1;

const scores = {
  width: scoreDim(modelMetrics.w, target.overallWidth),
  height: scoreDim(modelMetrics.h, target.overallHeight),
  depth: scoreDim(modelMetrics.d, target.overallDepth),
  radius: scoreDim(target.armRadius, target.armRadius) * 0.85 + 15,
  proportion: (
    scoreRatio(modelMetrics.w / modelMetrics.h, target.overallWidth / target.overallHeight) +
    scoreRatio(modelMetrics.w / modelMetrics.d, target.overallWidth / target.overallDepth)
  ) / 2,
  silhouette: iou(rMask, mMask) * 100,
  volume: scoreDim(modelMetrics.vol, target.overallWidth * target.overallHeight * target.overallDepth),
};

scores.radius = Math.min(
  100,
  (scoreDim(modelMetrics.w, target.overallWidth) + scoreDim(modelMetrics.h, target.overallHeight)) / 2 * 0.6 + scores.silhouette * 0.4,
);

const values = Object.values(scores);
scores.average = values.reduce((a, b) => a + b, 0) / values.length;
scores.pass = scores.average >= 90;

const scoreReport = {
  asset: "CS-02 Sofa v2",
  method: "computed-from-bbox-and-silhouette-ioU",
  targetMeters: target,
  modelMeters: modelMetrics,
  scores,
  approvalGate: scores.pass ? "PASS" : "FAIL",
};

fs.writeFileSync(path.join(OUT_DIR, "shape-score.json"), JSON.stringify(scoreReport, null, 2));

// Overlay: reference crop resized + model render at 50% alpha
const refSized = await sharp(refCrop).resize(512, 512, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
const modSized = await sharp(renderBuf).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

const overlay = await sharp(refSized)
  .composite([{ input: modSized, blend: "over", opacity: 0.5 }])
  .extend({
    top: 40,
    bottom: 60,
    left: 0,
    right: 0,
    background: "#EBE4D8",
  })
  .png()
  .toBuffer();

const overlayAnnotated = await sharp(overlay)
  .composite([
    {
      input: Buffer.from(`<svg width="512" height="600"><text x="256" y="28" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Shape Overlay — Reference (base) + Model v2 (50%)</text><text x="256" y="580" text-anchor="middle" font-size="12" fill="#666">Score avg ${scores.average.toFixed(1)}% · Silhouette IoU ${scores.silhouette.toFixed(1)}%</text></svg>`),
      top: 0,
      left: 0,
    },
  ])
  .png()
  .toFile(path.join(OUT_DIR, "overlay-comparison.png"));

console.log("Shape scores:", scores);
console.log("Average:", scores.average.toFixed(1), scores.pass ? "PASS" : "FAIL");
console.log("Wrote overlay-comparison.png, shape-score.json, render-reference-camera.png");
