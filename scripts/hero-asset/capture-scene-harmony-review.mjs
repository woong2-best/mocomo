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
const OUT = path.join(PUBLIC, "apt/hero-assets/scene-harmony-review-1");
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
    server.listen(3462, "127.0.0.1", () => resolve(server));
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

await capture(
  page,
  "http://127.0.0.1:3462/apt/hero-assets/scene-harmony-assembly.html?view=camera",
  path.join(OUT, "01-full-render.png"),
);
await capture(
  page,
  "http://127.0.0.1:3462/apt/hero-assets/scene-harmony-assembly.html?view=camera",
  path.join(OUT, "04-camera-view.png"),
);
await capture(
  page,
  "http://127.0.0.1:3462/apt/hero-assets/scene-harmony-assembly.html?view=top",
  path.join(OUT, "03-top-view-layout.png"),
);

const refCrop = await sharp(REF).extract({ left: 25, top: 245, width: 175, height: 95 }).resize(768, 420, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
const current = fs.readFileSync(path.join(OUT, "01-full-render.png"));
const currentSized = await sharp(current).resize(768, 420, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
const labelSvg = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Reference (living corner crop)</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Current Scene Harmony #1 (graybox)</text></svg>`,
);
const compare = await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
  .composite([
    { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
    { input: refCrop, left: 0, top: 32 },
    { input: currentSized, left: 768, top: 32 },
  ])
  .png()
  .toBuffer();
fs.writeFileSync(path.join(OUT, "02-reference-vs-current.png"), compare);

const backlog = JSON.parse(fs.readFileSync(path.join(PUBLIC, "apt/hero-assets/revision-backlog.json"), "utf8"));
fs.writeFileSync(path.join(OUT, "05-revision-backlog-summary.json"), JSON.stringify(backlog, null, 2));

const selfAssessment = {
  reviewId: "scene-harmony-1",
  date: "2026-06-27",
  stage: "graybox — pre Lighting/Material",
  overallImpression: "Living corner reads as a coherent dollhouse layout; warm/stable direction present but not yet inviting at reference level.",
  scores: {
    spaceDensity: { rating: "good", note: "Furniture cluster balanced; forward floor margin available" },
    furnitureScaleRatio: { rating: "partial", note: "Sofa/table/rug scale coherent; TV stand height OK; lamp tall but acceptable" },
    furnitureSpacing: { rating: "partial", note: "Table–sofa distance reasonable; plant/lamp need Harmony tuning near left wall" },
    rugPlacement: { rating: "good", note: "Anchors seating zone; could shift slightly toward sofa" },
    plantPlacement: { rating: "needs-work", note: "Should be floor corner accent, not overlapping sofa read" },
    lampPlacement: { rating: "partial", note: "Left corner correct zone; distance to window/wall TBD in shell context" },
    tvStandPlacement: { rating: "good", note: "Right wall focal axis; faces seating" },
    wallWindowProportion: { rating: "partial", note: "Shell window recess present; alignment vs reference needs Owner eye" },
    cameraFraming: { rating: "partial", note: "35°/45° ortho matches lock; zoom may need +5% for 70% frame fill" },
    sightlineFlow: { rating: "good", note: "Sofa → table → TV axis readable" },
    emptySpaceBalance: { rating: "good", note: "Open floor in front preserves breathing room" },
    atmosphere: { rating: "partial", note: "Graybox limits warmth; structure supports future Material/Lighting pass" },
  },
  firstImpression: "Structure is playable; not yet 'want to hang out here' — expected at graybox Harmony #1",
  deferredToHarmonyPass: [
    "Plant floor placement (not on sofa arm)",
    "Rug nudge toward back wall",
    "Camera zoom to Style Lock ~70% frame fill",
    "All revision-backlog shape tweaks after spatial approval",
  ],
  heroAssetIteration: "frozen — backlog only until Harmony decisions",
};

fs.writeFileSync(path.join(OUT, "06-self-assessment.json"), JSON.stringify(selfAssessment, null, 2));

await browser.close();
server.close();

console.log("Scene Harmony Review #1 outputs:", OUT);
