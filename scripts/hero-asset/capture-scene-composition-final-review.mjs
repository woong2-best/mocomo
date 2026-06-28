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
const OUT = path.join(PUBLIC, "apt/hero-assets/scene-composition-final-review");
const REF = path.join(PUBLIC, "apt/reference/apt-target-mockup.png");
const BASE = "http://127.0.0.1:3464/apt/hero-assets/scene-composition-assembly.html";

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
    server.listen(3464, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, url, outPath) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, type: "png" });
}

async function sizedPng(inputPath) {
  return sharp(inputPath).resize(768, 420, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });

await capture(page, `${BASE}?pass=3&view=default`, path.join(OUT, "01-current-scene.png"));
await capture(page, `${BASE}?pass=3&view=cameraA`, path.join(OUT, "02-camera-a.png"));
await capture(page, `${BASE}?pass=3&view=cameraB`, path.join(OUT, "03-camera-b.png"));
await capture(page, `${BASE}?pass=3&view=top`, path.join(OUT, "04-top-view.png"));

const before = await sizedPng(path.join(PUBLIC, "apt/hero-assets/scene-composition-review-2/01-full-screen.png"));
const after = await sizedPng(path.join(OUT, "01-current-scene.png"));
const baLabel = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Before (Composition Pass #1)</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">After (Composition Pass #2)</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "05-before-after.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(baLabel).png().toBuffer(), left: 0, top: 0 },
      { input: before, left: 0, top: 32 },
      { input: after, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

const refCrop = await sharp(REF)
  .extract({ left: 25, top: 245, width: 175, height: 95 })
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const cmpLabel = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Reference</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Composition Final (Pass #2)</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "06-reference-comparison.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(cmpLabel).png().toBuffer(), left: 0, top: 0 },
      { input: refCrop, left: 0, top: 32 },
      { input: after, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

const rationale =
  "Seating zone (sofa, rug, table) was tightened into a single cluster anchored on the rug so the living area reads as one group, not three separate objects. " +
  "The cluster sits toward the back-left corner, leaving a deliberate foreground void for circulation—negative space as design, not leftover floor. " +
  "Plant and floor lamp share the left wall corner as a quiet finishing vignette, angled toward the walls so they frame the room without competing with the sofa. " +
  "TV stand angle and distance preserve a natural viewing axis from the sofa. " +
  "Camera A was lowered and brought closer (32° elevation, ~87% frame fill) so the sofa becomes the emotional entry point—the first thing you see is where you would sit.";

const selfReview = {
  reviewId: "scene-composition-final",
  date: "2026-06-27",
  stage: "composition pass #2 — no Lighting/Material",
  status: "pending-owner-approval",
  changesFromPass1: [
    "Camera A: elevation 32°, fr 1.44 (~87% fill), lower target on sofa",
    "Seating cluster tightened — rug under sofa, table closer",
    "Foreground negative space for circulation path",
    "Plant rotated toward wall corner",
    "Plant + lamp paired as corner vignette",
    "TV stand angle/distance for viewing axis",
  ],
  scores: {
    firstImpression: { rating: "partial-improved", note: "Sofa-forward framing; still graybox not 'wow'" },
    spatialStability: { rating: "good", note: "Cluster grounded in L-shell" },
    sightlineFlow: { rating: "good", note: "Sofa → table → TV reads as one living gesture" },
    spatialRhythm: { rating: "partial-improved", note: "Seating group unified; corner vignette paired" },
    negativeSpace: { rating: "partial-improved", note: "Foreground void more intentional" },
    spaceDensity: { rating: "good", note: "Tighter hero cluster, open approach path" },
    warmthWithoutLighting: { rating: "partial", note: "Composition only — emotion needs Lighting/Material" },
    feelsLikeGame: { rating: "partial-improved", note: "Closer dollhouse read; playable space clearer" },
  },
  approvalGate: "Owner approval → composition frozen → Lighting Pass",
  placementRationale: rationale,
};

fs.writeFileSync(path.join(OUT, "07-composition-self-review.json"), JSON.stringify(selfReview, null, 2));
fs.writeFileSync(path.join(OUT, "08-placement-rationale.txt"), rationale + "\n");

await browser.close();
server.close();

console.log("Scene Composition Final Review outputs:", OUT);
