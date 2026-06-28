import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { createServer } from "http";
import { lookup } from "mime-types";
import {
  loadAssetConfig,
  heroAssetDir,
  heroGlbPath,
  ensureDir,
} from "./lib/utils.mjs";
import { generateSofaBlueprint } from "./lib/blueprint.mjs";
import { generateCoffeeTableBlueprint } from "./lib/blueprint-table.mjs";
import { generateRugBlueprint } from "./lib/blueprint-rug.mjs";
import { generatePlantBlueprint } from "./lib/blueprint-plant.mjs";
import { generateFloorLampBlueprint } from "./lib/blueprint-floor-lamp.mjs";
import { generateTvStandBlueprint } from "./lib/blueprint-tv-stand.mjs";
import { generateCornerShellBlueprint } from "./lib/blueprint-corner-shell.mjs";
import { buildSofaFromAnalysis } from "./lib/build-sofa.mjs";
import { buildCoffeeTableFromAnalysis } from "./lib/build-coffee-table.mjs";
import { buildRugFromAnalysis } from "./lib/build-rug.mjs";
import { buildPlantFromAnalysis } from "./lib/build-plant.mjs";
import { buildFloorLampFromAnalysis } from "./lib/build-floor-lamp.mjs";
import { buildTvStandFromAnalysis } from "./lib/build-tv-stand.mjs";
import { buildCornerShellFromAnalysis } from "./lib/build-corner-shell.mjs";
import { extractOutline, resizeToSquare, diffVisualization, outlineOverlay } from "./lib/outline.mjs";
import { scoreDimensions, runAssetGate } from "./lib/measure-gate.mjs";
import { exportGlb } from "../lib/gltf-export.mjs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../../public");
const PORT = 3460;

const assetId = process.argv[2] || "sofa";
const version = Number(process.argv[3] || 3);
const skipGlb = process.argv.includes("--blueprint-only");

const ASSET_HANDLERS = {
  sofa: {
    reverseScript: "../sofa/reverse-engineer-reference.mjs",
    generateBlueprint: generateSofaBlueprint,
    build: buildSofaFromAnalysis,
  },
  "coffee-table": {
    reverseScript: "../coffee-table/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generateCoffeeTableBlueprint(analysis, outDir, title),
    build: buildCoffeeTableFromAnalysis,
  },
  rug: {
    reverseScript: "../rug/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generateRugBlueprint(analysis, outDir, title),
    build: buildRugFromAnalysis,
  },
  plant: {
    reverseScript: "../plant/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generatePlantBlueprint(analysis, outDir, title),
    build: buildPlantFromAnalysis,
  },
  "floor-lamp": {
    reverseScript: "../floor-lamp/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generateFloorLampBlueprint(analysis, outDir, title),
    build: buildFloorLampFromAnalysis,
  },
  "tv-stand": {
    reverseScript: "../tv-stand/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generateTvStandBlueprint(analysis, outDir, title),
    build: buildTvStandFromAnalysis,
  },
  "corner-shell": {
    reverseScript: "../corner-shell/reverse-engineer-reference.mjs",
    generateBlueprint: (analysis, outDir, title) => generateCornerShellBlueprint(analysis, outDir, title),
    build: buildCornerShellFromAnalysis,
  },
};

const handler = ASSET_HANDLERS[assetId];
if (!handler) {
  console.error(`Unknown assetId: ${assetId}. Supported: ${Object.keys(ASSET_HANDLERS).join(", ")}`);
  process.exit(1);
}

const config = loadAssetConfig(assetId);
const outDir = heroAssetDir(assetId, version);
const glbPath = heroGlbPath(assetId, version);
ensureDir(outDir);
ensureDir(path.dirname(glbPath));

const cornerSampleDir = path.join(PUBLIC, "apt/corner-sample", assetId);
const analysisSrc = path.join(__dirname, handler.reverseScript);
await import(`file://${analysisSrc.replace(/\\/g, "/")}`);

const analysis = JSON.parse(fs.readFileSync(path.join(cornerSampleDir, "shape-analysis.json"), "utf8"));
fs.copyFileSync(path.join(cornerSampleDir, "shape-analysis.json"), path.join(outDir, "shape-analysis.json"));
fs.copyFileSync(path.join(cornerSampleDir, "reference-crop.png"), path.join(outDir, "reference-crop.png"));
fs.copyFileSync(path.join(cornerSampleDir, "reference-silhouette.png"), path.join(outDir, "reference-silhouette.png"));

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

console.log(`[1/7] Reverse Engineering → shape-analysis.json (${assetId})`);

await handler.generateBlueprint(analysis, outDir, config.name);
console.log("[2/7] Blueprint → shape-blueprint.png (6 views incl. Cross Section)");

if (skipGlb) {
  console.log("Blueprint-only mode. GLB skipped until owner approval.");
  process.exit(0);
}

const { root, GLTFExporter, measured } = await handler.build(analysis, version);
const glbBuf = await exportGlb(GLTFExporter, root);
fs.writeFileSync(glbPath, glbBuf);
console.log(`[3/7] GLB → ${glbPath} (${(glbBuf.length / 1024).toFixed(1)} KB)`);

const rotY = config.camera?.rotationY ?? 0.12;
const renderHtml = `<!DOCTYPE html><html><head><script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.184.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.184.0/examples/jsm/"}}</script></head><body style="margin:0;background:#ebe4d8"><canvas id="c" width="512" height="512"></canvas><script type="module">
import * as THREE from 'three'; import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const cv=document.getElementById('c'); const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true}); r.setSize(512,512,false); r.setClearColor(0x000000,0);
const sc=new THREE.Scene(); sc.add(new THREE.HemisphereLight('#fff','#ccc',.65)); const k=new THREE.DirectionalLight('#fff',.95); k.position.set(3,5,2); sc.add(k);
const az=THREE.MathUtils.degToRad(45), el=THREE.MathUtils.degToRad(35); const cam=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);
const gltf=await new GLTFLoader().loadAsync('/apt/glb/hero-assets/${assetId}-v${version}.glb'); const m=gltf.scene; m.rotation.y=Math.PI*${rotY}; sc.add(m);
const box=new THREE.Box3().setFromObject(m); const sz=box.getSize(new THREE.Vector3()); const c=box.getCenter(new THREE.Vector3()); const md=Math.max(sz.x,sz.y,sz.z); const d=md*2.4;
cam.position.set(c.x+d*Math.cos(el)*Math.sin(az), c.y+d*Math.sin(el), c.z+d*Math.cos(el)*Math.cos(az)); cam.lookAt(c); const fr=md*1.15; cam.left=-fr; cam.right=fr; cam.top=fr; cam.bottom=-fr; cam.updateProjectionMatrix();
r.render(sc,cam); window.__READY__=true;
</script></body></html>`;

const renderHtmlPath = path.join(outDir, "_render.html");
fs.writeFileSync(renderHtmlPath, renderHtml);

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:${PORT}/apt/hero-assets/${assetId}/v${version}/_render.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__READY__ === true);
const renderBuf = await page.screenshot({ type: "png", omitBackground: true });
await browser.close();
server.close();

fs.writeFileSync(path.join(outDir, "render.png"), renderBuf);
console.log("[4/7] Render → render.png");

const refCrop = fs.readFileSync(path.join(outDir, "reference-crop.png"));
const refSized = await resizeToSquare(refCrop, 512);
const modSized = await sharp(await resizeToSquare(renderBuf, 512)).flatten({ background: "#EBE4D8" }).png().toBuffer();

const refOutline = await extractOutline(refSized, { threshold: 180, color: { r: 255, g: 80, b: 80 } });
const glbOutline = await extractOutline(modSized, { threshold: 180, color: { r: 80, g: 160, b: 255 } });

fs.writeFileSync(path.join(outDir, "reference-outline.png"), refOutline);
fs.writeFileSync(path.join(outDir, "glb-outline.png"), glbOutline);

const overlay = await outlineOverlay(refOutline, glbOutline, 512);
const diff = await diffVisualization(refOutline, glbOutline, 512);

fs.writeFileSync(path.join(outDir, "outline-overlay.png"), overlay);
fs.writeFileSync(path.join(outDir, "diff-visualization.png"), diff);

const refCompare = await sharp(refSized).extend({ right: 512, background: "#EBE4D8" }).composite([{ input: modSized, left: 512, top: 0 }]).png().toBuffer();
fs.writeFileSync(path.join(outDir, "reference-vs-render.png"), refCompare);

fs.writeFileSync(path.join(outDir, "reference.png"), refSized);
const blendOverlay = await sharp(refSized).composite([{ input: modSized, blend: "over", opacity: 0.52 }]).png().toBuffer();
fs.writeFileSync(path.join(outDir, "reference-blend-overlay.png"), blendOverlay);

const prevRender = path.join(PUBLIC, `apt/hero-assets/${assetId}/v${version - 1}/render.png`);
if (fs.existsSync(prevRender)) {
  const prevSized = await sharp(prevRender).resize(512, 512, { fit: "contain", background: "#EBE4D8" }).png().toBuffer();
  const labelSvg = Buffer.from(
    `<svg width="1024" height="36"><text x="256" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">v${version - 1} (before)</text><text x="768" y="24" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#4A4038">v${version} (after)</text></svg>`,
  );
  const beforeAfter = await sharp({
    create: { width: 1024, height: 548, channels: 3, background: "#EBE4D8" },
  })
    .composite([
      { input: await sharp(labelSvg).png().toBuffer(), left: 0, top: 0 },
      { input: prevSized, left: 0, top: 36 },
      { input: modSized, left: 512, top: 36 },
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, `v${version - 1}-vs-v${version}.png`), beforeAfter);
}
console.log("[5/7] Reference Outline → reference-outline.png");
console.log("[6/7] GLB Outline + Overlay + Diff");

const dimensionScore = scoreDimensions(config, analysis, measured);
fs.writeFileSync(path.join(outDir, "dimension-score.json"), JSON.stringify(dimensionScore, null, 2));

const gate = runAssetGate(assetId, version, config, {
  glb: glbPath,
  blueprint: path.join(outDir, "shape-blueprint.png"),
  outlineOverlay: path.join(outDir, "outline-overlay.png"),
  diff: path.join(outDir, "diff-visualization.png"),
}, dimensionScore);

fs.writeFileSync(path.join(outDir, "asset-gate.json"), JSON.stringify(gate, null, 2));
console.log("[7/7] Dimension score avg:", dimensionScore.average, "| Asset Gate auto:", gate.autoPass ? "PASS" : "FAIL");
console.log("Output:", outDir);
