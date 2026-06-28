import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { createServer } from "http";
import { lookup } from "mime-types";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "apt/hero-assets/_scene-polish-2");
const POLISH1 = path.join(PUBLIC, "apt/hero-assets/_scene-polish");
const BASE = "http://127.0.0.1:3470/apt/hero-assets/scene-material-assembly.html";
const REF = path.join(PUBLIC, "apt/reference/apt-target-mockup.png");

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
    server.listen(3470, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, query, outPath, viewport = { width: 1024, height: 768 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}?${query}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(900);
  await page.screenshot({ path: outPath, type: "png" });
}

async function sideBySide(leftPath, rightPath, labels, outPath, panelW = 768, panelH = 576) {
  const left = await sharp(leftPath).resize(panelW, panelH, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
  const right = await sharp(rightPath).resize(panelW, panelH, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
  const labelSvg = Buffer.from(
    `<svg width="${panelW * 2}" height="36" xmlns="http://www.w3.org/2000/svg">
      <text x="${panelW / 2}" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">${labels[0]}</text>
      <text x="${panelW + panelW / 2}" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">${labels[1]}</text>
    </svg>`,
  );
  fs.writeFileSync(
    outPath,
    await sharp({ create: { width: panelW * 2, height: panelH + 36, channels: 3, background: "#EBE4D8" } })
      .composite([
        { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
        { input: left, left: 0, top: 36 },
        { input: right, left: panelW, top: 36 },
      ])
      .png()
      .toBuffer(),
  );
}

async function gridFour(images, labels, outPath, cellW = 480, cellH = 360) {
  const cells = [];
  for (let i = 0; i < 4; i++) {
    cells.push(
      await sharp(images[i])
        .resize(cellW, cellH, { fit: "cover", position: "centre" })
        .png()
        .toBuffer(),
    );
  }
  const labelSvg = Buffer.from(
    `<svg width="${cellW * 2}" height="28" xmlns="http://www.w3.org/2000/svg">
      <text x="${cellW / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#4A4038">${labels[0]}</text>
      <text x="${cellW + cellW / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#4A4038">${labels[1]}</text>
    </svg>`,
  );
  const labelSvg2 = Buffer.from(
    `<svg width="${cellW * 2}" height="28" xmlns="http://www.w3.org/2000/svg">
      <text x="${cellW / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#4A4038">${labels[2]}</text>
      <text x="${cellW + cellW / 2}" y="20" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#4A4038">${labels[3]}</text>
    </svg>`,
  );
  fs.writeFileSync(
    outPath,
    await sharp({ create: { width: cellW * 2, height: cellH * 2 + 56, channels: 3, background: "#EBE4D8" } })
      .composite([
        { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
        { input: cells[0], left: 0, top: 28 },
        { input: cells[1], left: cellW, top: 28 },
        { input: await sharp(labelSvg2).png().toBuffer(), left: 0, top: cellH + 28 },
        { input: cells[2], left: 0, top: cellH + 56 },
        { input: cells[3], left: cellW, top: cellH + 56 },
      ])
      .png()
      .toBuffer(),
  );
}

async function colorHarmonyBoard(refPath, currentPath, outPath) {
  const swatch = async (imgPath, x, y, w, h) => {
    const { data, info } = await sharp(imgPath)
      .extract({ left: x, top: y, width: w, height: h })
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const r = data[0];
    const g = data[1];
    const b = data[2];
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };

  const refMeta = await sharp(refPath).metadata();
  const curMeta = await sharp(currentPath).metadata();
  const rw = refMeta.width;
  const rh = refMeta.height;
  const cw = curMeta.width;
  const ch = curMeta.height;

  const samples = [
    { label: "Sofa", ref: [rw * 0.52, rh * 0.58, rw * 0.18, rh * 0.12], cur: [cw * 0.52, ch * 0.58, cw * 0.18, ch * 0.12] },
    { label: "Wood", ref: [rw * 0.38, rh * 0.72, rw * 0.12, rh * 0.08], cur: [cw * 0.38, ch * 0.72, cw * 0.12, ch * 0.08] },
    { label: "Green", ref: [rw * 0.18, rh * 0.55, rw * 0.08, rh * 0.1], cur: [cw * 0.18, ch * 0.55, cw * 0.08, ch * 0.1] },
    { label: "Wall", ref: [rw * 0.08, rh * 0.2, rw * 0.1, rh * 0.08], cur: [cw * 0.08, ch * 0.2, cw * 0.1, ch * 0.08] },
    { label: "Rug", ref: [rw * 0.45, rh * 0.78, rw * 0.14, rh * 0.06], cur: [cw * 0.45, ch * 0.78, cw * 0.14, ch * 0.06] },
    { label: "TV", ref: [rw * 0.12, rh * 0.42, rw * 0.08, rh * 0.06], cur: [cw * 0.12, ch * 0.42, cw * 0.08, ch * 0.06] },
  ];

  const rows = [];
  for (const s of samples) {
    const [rx, ry, rw2, rh2] = s.ref.map(Math.floor);
    const [cx, cy, cw2, ch2] = s.cur.map(Math.floor);
    rows.push({
      label: s.label,
      ref: await swatch(refPath, rx, ry, rw2, rh2),
      cur: await swatch(currentPath, cx, cy, cw2, ch2),
    });
  }

  const rowH = 72;
  const pad = 20;
  const w = 920;
  const h = pad * 2 + 40 + rows.length * rowH;
  const rects = rows
    .map((row, i) => {
      const y = pad + 40 + i * rowH;
      return `
        <text x="${pad}" y="${y + 28}" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">${row.label}</text>
        <rect x="120" y="${y + 6}" width="48" height="48" rx="8" fill="${row.ref}" stroke="#D8D0C8"/>
        <text x="178" y="${y + 34}" font-family="ui-monospace" font-size="12" fill="#7A7068">${row.ref} · Reference</text>
        <rect x="420" y="${y + 6}" width="48" height="48" rx="8" fill="${row.cur}" stroke="#D8D0C8"/>
        <text x="478" y="${y + 34}" font-family="ui-monospace" font-size="12" fill="#7A7068">${row.cur} · Current</text>
      `;
    })
    .join("");

  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#EBE4D8"/>
      <text x="${w / 2}" y="32" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="#4A4038">Color Harmony — Reference vs Current</text>
      ${rects}
    </svg>`,
  );
  fs.writeFileSync(outPath, await sharp(svg).png().toBuffer());
  return rows;
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

await capture(page, "compare=0", path.join(OUT, "01-current-scene.png"));
await capture(page, "compare=1", path.join(OUT, "02-ref-vs-current.png"), { width: 2048, height: 768 });
await capture(page, "compare=0&zone=sofa", path.join(OUT, "_sofa-zone.png"), { width: 1024, height: 768 });
await capture(page, "compare=0", path.join(OUT, "_full-scene.png"));

const fullMeta = await sharp(path.join(OUT, "_full-scene.png")).metadata();
const fw = fullMeta.width;
const fh = fullMeta.height;
const crop = (x, y, w, h, out) =>
  sharp(path.join(OUT, "_full-scene.png"))
    .extract({
      left: Math.floor(fw * x),
      top: Math.floor(fh * y),
      width: Math.floor(fw * w),
      height: Math.floor(fh * h),
    })
    .png()
    .toFile(out);

await crop(0.02, 0.12, 0.3, 0.42, path.join(OUT, "_plant-crop.png"));
await crop(0.12, 0.04, 0.22, 0.34, path.join(OUT, "_lamp-crop.png"));
await crop(0.68, 0.02, 0.3, 0.38, path.join(OUT, "_tv-crop.png"));

await gridFour(
  [
    path.join(OUT, "_sofa-zone.png"),
    path.join(OUT, "_lamp-crop.png"),
    path.join(OUT, "_plant-crop.png"),
    path.join(OUT, "_tv-crop.png"),
  ],
  ["Sofa (Hero)", "Floor Lamp", "Plant Pot", "TV + Stand"],
  path.join(OUT, "04-shape-language-comparison.png"),
);

const polish1Before = path.join(POLISH1, "after-polish.png");
const polish2After = path.join(OUT, "01-current-scene.png");
if (fs.existsSync(polish1Before)) {
  await sideBySide(polish1Before, polish2After, ["Polish #1", "Polish #2"], path.join(OUT, "03-before-after-polish.png"));
} else {
  await sideBySide(polish2After, polish2After, ["Polish #1 (missing)", "Polish #2"], path.join(OUT, "03-before-after-polish.png"));
}

const colorRows = await colorHarmonyBoard(REF, polish2After, path.join(OUT, "05-color-harmony-comparison.png"));

const selfReview = {
  reviewId: "scene-polish-2",
  date: "2026-06-27",
  stage: "Scene Polish #2 — shape language + color harmony + hero hierarchy",
  evaluationQuestion: "Reference를 가리고 현재 화면만 봤을 때, Bondee가 만든 공간처럼 느껴지는가?",
  changes: {
    sofa: "Unified cloud silhouette — single back, arm bridges, minimal cushion seams, squishy puff",
    shapeLanguage: "SCENE_LANGUAGE bevel bump; lamp/plant/tv-stand softer rounded boxes, TV scaled down",
    colorHarmony: "Warm wood, muted green, ivory wall/rug, no pure black TV panel, lower contrast grade",
    heroHierarchy: "Sofa brightness up; TV stand scale 0.76 + muted screen; plant/lamp as support",
    toyScale: "Uniform bevelPlush 0.105 / bevelWood 0.024 across hero rebuilds",
  },
  forbiddenNotDone: ["new props", "story layer", "lighting rig", "composition", "camera (restored pass3)"],
  colorSamples: colorRows,
  scores: {
    sceneUnity: {
      rating: "partial-good",
      note: "Sofa reads as one blob; lamp/plant/TV share rounded-box family but still slightly separate from sofa plush language",
    },
    heroHierarchy: {
      rating: "good",
      note: "0.5s read: sofa → table/rug cluster → plant → recessed TV; TV no longer competes with hero",
    },
    bondeeSimilarity: {
      rating: "partial-good",
      note: "Lower saturation and warmer neutrals move off CG; not yet indistinguishable from reference without side-by-side",
    },
  },
  overall:
    "Polish #2 tightens one-artist shape language and Bondee color curve; scene reads more like a toy apartment than separate models",
  nextGate: "Owner answers Bondee-feel question; if yes → Final Polish",
};

fs.writeFileSync(path.join(OUT, "06-self-review.json"), JSON.stringify(selfReview, null, 2));

await browser.close();
server.close();

console.log("Scene Polish #2 outputs:", OUT);
