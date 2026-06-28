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
const OUT = path.join(PUBLIC, "apt/hero-assets/scene-lighting-review-1");
const BASE = "http://127.0.0.1:3465/apt/hero-assets/scene-lighting-assembly.html";

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
    server.listen(3465, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, query, outPath) {
  await page.goto(`${BASE}?${query}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: outPath, type: "png" });
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });

await capture(page, "mode=on&view=cameraA", path.join(OUT, "01-current-scene.png"));
await capture(page, "mode=off&view=cameraA", path.join(OUT, "_lighting-off.png"));
await capture(page, "mode=on&view=cameraA", path.join(OUT, "_lighting-on.png"));
await capture(page, "mode=shadow&view=cameraA", path.join(OUT, "03-shadow-only.png"));
await capture(page, "mode=ao&view=cameraA", path.join(OUT, "04-ao-only.png"));
await capture(page, "mode=window&view=cameraA", path.join(OUT, "05-window-light-direction.png"));
await capture(page, "mode=on&view=cameraA", path.join(OUT, "06-camera-a.png"));

const off = await sharp(path.join(OUT, "_lighting-off.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const on = await sharp(path.join(OUT, "_lighting-on.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const label = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Lighting OFF</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Lighting ON</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "02-lighting-off-on.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(label).png().toBuffer(), left: 0, top: 0 },
      { input: off, left: 0, top: 32 },
      { input: on, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

const selfReview = {
  reviewId: "scene-lighting-1",
  date: "2026-06-27",
  stage: "lighting pass #1 — composition locked, no material",
  rig: {
    hemisphere: { sky: "#FFF4E6", ground: "#E8C9A0", intensity: 0.45 },
    key: { color: "#FFF4E6", intensity: 1.15, position: [6, 10, 4], shadow: "PCF soft 2048" },
    fill: { color: "#E8F0FF", intensity: 0.28 },
    rim: { color: "#FFF0D8", intensity: 0.18 },
    windowBounce: { color: "#FFE8C8", intensity: 0.42, from: "left wall" },
    toneMapping: "ACESFilmic",
    exposure: 1.0,
  },
  scores: {
    warmth: { rating: "partial-improved", note: "Golden-hour key + window bounce; gray materials limit warmth" },
    depth: { rating: "partial-improved", note: "Soft contrast + rim; SSAO subtle" },
    shadowQuality: { rating: "good", note: "Contact shadows on floor/furniture base" },
    spatialDepth: { rating: "partial-improved", note: "Wall-floor connection improved vs flat off" },
    focus: { rating: "good", note: "Key from upper-right draws eye to seating cluster" },
    emotionalTone: { rating: "partial", note: "Direction correct; Material Pass needed for 'want to stay'" },
  },
  overall: "Lighting adds life and depth to locked composition; emotional target needs Material next",
  forbiddenNotDone: ["material", "texture", "color tuning", "composition change", "asset shape"],
  nextPass: "Owner Review → Material Pass",
};

fs.writeFileSync(path.join(OUT, "07-self-review.json"), JSON.stringify(selfReview, null, 2));

await browser.close();
server.close();

console.log("Lighting Review #1 outputs:", OUT);
