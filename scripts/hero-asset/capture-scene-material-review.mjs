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
const MAT_DIR = path.join(PUBLIC, "apt/materials");
const OUT = path.join(PUBLIC, "apt/hero-assets/scene-material-review-1");
const BASE = "http://127.0.0.1:3466/apt/hero-assets/scene-material-assembly.html";

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
    server.listen(3466, "127.0.0.1", () => resolve(server));
  });
}

async function capture(page, query, outPath) {
  await page.goto(`${BASE}?${query}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => window.__READY__ === true);
  await page.waitForTimeout(700);
  await page.screenshot({ path: outPath, type: "png" });
}

async function buildPaletteImage(outPath) {
  const index = JSON.parse(fs.readFileSync(path.join(MAT_DIR, "index.json"), "utf8"));
  const swatches = [];
  for (const entry of index.materials) {
    const def = JSON.parse(fs.readFileSync(path.join(MAT_DIR, entry.file), "utf8"));
    swatches.push({ ...def, category: entry.category });
  }

  const cols = 4;
  const rows = Math.ceil(swatches.length / cols);
  const sw = 280;
  const sh = 88;
  const pad = 24;
  const titleH = 48;
  const w = cols * sw + (cols + 1) * pad;
  const h = titleH + rows * sh + (rows + 1) * pad;

  const rects = swatches
    .map((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (sw + pad);
      const y = titleH + pad + row * (sh + pad);
      return `
        <rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="10" fill="#F8F4EE" stroke="#D8D0C8"/>
        <rect x="${x + 12}" y="${y + 12}" width="64" height="64" rx="8" fill="${s.color}"/>
        <text x="${x + 88}" y="${y + 32}" font-family="system-ui" font-size="13" font-weight="700" fill="#4A4038">${s.label}</text>
        <text x="${x + 88}" y="${y + 50}" font-family="system-ui" font-size="11" fill="#7A7068">${s.category}</text>
        <text x="${x + 88}" y="${y + 68}" font-family="ui-monospace, monospace" font-size="10" fill="#9A9088">${s.color}</text>
      `;
    })
    .join("");

  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#EBE4D8"/>
      <text x="${w / 2}" y="32" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="#4A4038">MoCoMo Material Palette</text>
      ${rects}
    </svg>`,
  );

  fs.writeFileSync(outPath, await sharp(svg).png().toBuffer());
}

async function buildLibraryListing(outPath) {
  const index = JSON.parse(fs.readFileSync(path.join(MAT_DIR, "index.json"), "utf8"));
  const materials = index.materials.map((entry) => {
    const def = JSON.parse(fs.readFileSync(path.join(MAT_DIR, entry.file), "utf8"));
    return {
      file: entry.file,
      id: def.id,
      category: entry.category,
      label: def.label,
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      usage: def.usage,
    };
  });

  const listing = {
    reviewId: "scene-material-1-library",
    date: "2026-06-27",
    version: index.version,
    direction: index.direction,
    categories: index.categories,
    rules: index.rules,
    materials,
    slotMap: JSON.parse(fs.readFileSync(path.join(MAT_DIR, "slot-map.json"), "utf8")),
  };

  fs.writeFileSync(outPath, JSON.stringify(listing, null, 2));
  return listing;
}

fs.mkdirSync(OUT, { recursive: true });

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });

await capture(page, "mode=material&view=cameraA", path.join(OUT, "01-current-scene.png"));
await capture(page, "mode=clay&view=cameraA", path.join(OUT, "_clay.png"));
await capture(page, "mode=material&view=cameraA", path.join(OUT, "_material.png"));
await capture(page, "mode=material&view=sofaClose", path.join(OUT, "05-sofa-closeup.png"));
await capture(page, "mode=material&view=woodClose", path.join(OUT, "06-wood-closeup.png"));
await capture(page, "mode=material&view=wallFloor", path.join(OUT, "07-wall-floor.png"));

const clay = await sharp(path.join(OUT, "_clay.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const material = await sharp(path.join(OUT, "_material.png"))
  .resize(768, 420, { fit: "contain", background: "#EBE4D8" })
  .png()
  .toBuffer();
const label = Buffer.from(
  `<svg width="1536" height="32"><text x="384" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Clay (Shape)</text><text x="1152" y="22" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">Material (Style)</text></svg>`,
);
fs.writeFileSync(
  path.join(OUT, "02-clay-vs-material.png"),
  await sharp({ create: { width: 1536, height: 452, channels: 3, background: "#EBE4D8" } })
    .composite([
      { input: await sharp(label).png().toBuffer(), left: 0, top: 0 },
      { input: clay, left: 0, top: 32 },
      { input: material, left: 768, top: 32 },
    ])
    .png()
    .toBuffer(),
);

await buildPaletteImage(path.join(OUT, "03-material-palette.png"));
const libraryListing = await buildLibraryListing(path.join(OUT, "04-material-library.json"));

const selfReview = {
  reviewId: "scene-material-1",
  date: "2026-06-27",
  stage: "material pass #1 — composition + lighting locked",
  libraryPath: "public/apt/materials/",
  materialCount: libraryListing.materials.length,
  categories: libraryListing.categories,
  colorHarmony: {
    sofa: "fabric-beige",
    coffeeTable: "oak-medium",
    tvStand: "oak-dark",
    floor: "floor-oak",
    wall: "wall-ivory",
    rug: "rug-cream",
    plantPot: "terracotta",
    leaves: "leaf-muted",
    lampShade: "fabric-ivory",
    lampBase: "metal-soft",
  },
  scores: {
    colorUnity: { rating: "good", note: "Warm neutral palette — beige, oak, ivory within Style Lock saturation" },
    warmth: { rating: "good", note: "Material adds emotional warmth beyond lighting-only pass" },
    materialHarmony: { rating: "good", note: "Wood tones gradated light→medium→dark; fabric/wall/floor share ivory-beige family" },
    reusableAcrossRooms: { rating: "good", note: "Shared .mat library + slot-map; no per-asset materials" },
    mocomoStyleLanguage: { rating: "partial-good", note: "Foundation established; more rooms will validate consistency" },
  },
  overall: "Material Language v1 establishes MoCoMo warm-neutral apartment style; ready for Owner review",
  forbiddenNotDone: ["composition change", "lighting change", "asset shape change", "texture maps", "normal maps"],
  nextPass: "Owner Review → Camera Polish or Material Pass #2 if revisions",
};

fs.writeFileSync(path.join(OUT, "08-self-review.json"), JSON.stringify(selfReview, null, 2));

await browser.close();
server.close();

console.log("Material Review #1 outputs:", OUT);
