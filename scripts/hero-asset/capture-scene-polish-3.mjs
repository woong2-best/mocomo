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
const OUT = path.join(PUBLIC, "apt/hero-assets/_scene-polish-3");
const POLISH2 = path.join(PUBLIC, "apt/hero-assets/_scene-polish-2");
const BASE = "http://127.0.0.1:3471/apt/hero-assets/scene-material-assembly.html";

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
    server.listen(3471, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, query, outPath, viewport = { width: 1024, height: 768 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}?${query}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(900);
  await page.screenshot({ path: outPath, type: "png" });
}

async function sideBySide(leftPath, rightPath, labels, outPath) {
  const panelW = 768;
  const panelH = 576;
  const left = await sharp(leftPath).resize(panelW, panelH, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
  const right = await sharp(rightPath).resize(panelW, panelH, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
  const labelSvg = Buffer.from(
    `<svg width="1536" height="36" xmlns="http://www.w3.org/2000/svg">
      <text x="384" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">${labels[0]}</text>
      <text x="1152" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">${labels[1]}</text>
    </svg>`,
  );
  fs.writeFileSync(
    outPath,
    await sharp({ create: { width: 1536, height: 612, channels: 3, background: "#EBE4D8" } })
      .composite([
        { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
        { input: left, left: 0, top: 36 },
        { input: right, left: 768, top: 36 },
      ])
      .png()
      .toBuffer(),
  );
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

await capture(page, "compare=0", path.join(OUT, "01-current-scene.png"));
await capture(page, "compare=0&zone=sofa", path.join(OUT, "02-sofa-marshmallow.png"));

const polish2 = path.join(POLISH2, "01-current-scene.png");
const polish3 = path.join(OUT, "01-current-scene.png");
if (fs.existsSync(polish2)) {
  await sideBySide(polish2, polish3, ["Polish #2", "Polish #3"], path.join(OUT, "03-before-after-polish.png"));
}

const selfReview = {
  reviewId: "scene-polish-3-final-candidate",
  date: "2026-06-27",
  stage: "Scene Polish #3 — Final Polish Candidate",
  finalGateQuestion: "이 장면을 처음 본 사람이 'Bondee 같은 게임이네'라고 자연스럽게 말할 수 있는가?",
  gateAnswer: "partial-no",
  gateReason:
    "Marshmallow sofa + toy scale + soft wood volume + luminance warmth move closer; still reads as stylized 3D room before Bondee first-impression",
  priorities: {
    sofa: "Overlapping blob meshes — core/back/front/crown/arms, no seat module loop",
    toyScale: "Shorter legs, thicker tops, squatter pot, shorter lamp, bevel bump",
    softVolume: "Wood HSL compressed, high roughness, env depth — not contrast bands",
    sceneWarmth: "Emissive wrap + shadow lift grade + softer SSAO — lighting rig untouched",
  },
  maintained: {
    heroHierarchy: "Sofa → Table → Rug → Plant → TV (unchanged from Polish #2 approval)",
    forbidden: ["story layer", "new assets", "composition", "camera", "lighting rig redesign"],
  },
  scores: {
    sceneUnity: { rating: "good", note: "Single marshmallow sofa + unified rounded language across furniture" },
    heroHierarchy: { rating: "good", note: "Approved hierarchy preserved" },
    bondeeFirstImpression: {
      rating: "partial",
      note: "Warmer and toy-like; needs Owner gate YES for Final Polish approval",
    },
  },
  overall: "Final Polish Candidate — toy warmth pass complete, awaiting Bondee first-impression gate",
};

fs.writeFileSync(path.join(OUT, "04-self-review.json"), JSON.stringify(selfReview, null, 2));

await browser.close();
server.close();

console.log("Scene Polish #3 outputs:", OUT);
