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
const OUT = path.join(PUBLIC, "apt/hero-assets/scene-composition-review-2");
const REF = path.join(PUBLIC, "apt/reference/apt-target-mockup.png");
const BASE = "http://127.0.0.1:3463/apt/hero-assets/scene-composition-assembly.html";

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
    server.listen(3463, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, url, outPath) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, type: "png" });
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });

await capture(page, `${BASE}?pass=2&view=default`, path.join(OUT, "01-full-screen.png"));
await capture(page, `${BASE}?pass=2&view=cameraA`, path.join(OUT, "02-camera-a.png"));
await capture(page, `${BASE}?pass=2&view=cameraB`, path.join(OUT, "03-camera-b.png"));
await capture(page, `${BASE}?pass=2&view=top`, path.join(OUT, "04-top-view.png"));

const refCrop = await sharp(REF)
  .extract({ left: 25, top: 245, width: 175, height: 95 })
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const current = await sharp(path.join(OUT, "01-full-screen.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const labelSvg = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Reference</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Composition Pass #1</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "05-reference-vs-current.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
      { input: refCrop, left: 0, top: 32 },
      { input: current, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

const before = await sharp(path.join(PUBLIC, "apt/hero-assets/scene-harmony-review-1/01-full-render.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const after = await sharp(path.join(OUT, "01-full-screen.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const baLabel = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Before (Harmony #1)</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">After (Composition Pass #1)</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "06-before-after.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(baLabel).png().toBuffer(), left: 0, top: 0 },
      { input: before, left: 0, top: 32 },
      { input: after, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

const selfAssessment = {
  reviewId: "scene-composition-2",
  date: "2026-06-27",
  stage: "composition pass #1 — no Lighting",
  changesApplied: [
    "Plant tucked to left wall corner — reduced sofa interference",
    "Rug shifted under sofa — seating zone anchor",
    "Camera closer — sofa-centered target, fr 1.58 (~82% fill)",
    "TV stand position unchanged — sofa–TV sight line verified in Camera B",
    "Window negative space preserved on left wall",
  ],
  scores: {
    firstImpression: { rating: "partial-improved", note: "Sofa reads as hero sooner; still graybox warmth gap" },
    spatialStability: { rating: "good", note: "L-shell + cluster feels grounded" },
    sightlineFlow: { rating: "good", note: "Sofa → table → TV axis clearer in Camera B" },
    spatialRhythm: { rating: "partial", note: "Rug/sofa/table rhythm improved; lamp/plant frame corner" },
    negativeSpace: { rating: "good", note: "Forward floor breathing room; window wall not crowded" },
    spaceDensity: { rating: "good", note: "Tighter framing without clutter" },
    warmthWithoutLighting: { rating: "partial", note: "Composition helps; color/material still flat" },
    feelsLikeGame: { rating: "partial-improved", note: "Closer camera reads more like in-room dollhouse view" },
  },
  overall: "Layout understood → slightly more 'want to explore'; emotional target still needs Lighting/Material",
  nextPass: "Owner Review #2 → Lighting Pass",
};

fs.writeFileSync(path.join(OUT, "07-composition-self-assessment.json"), JSON.stringify(selfAssessment, null, 2));

await browser.close();
server.close();

console.log("Scene Composition Review #2 outputs:", OUT);
