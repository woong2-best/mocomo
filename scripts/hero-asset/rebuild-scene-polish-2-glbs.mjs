import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exportGlb } from "../lib/gltf-export.mjs";
import { buildSofaFromAnalysis } from "./lib/build-sofa.mjs";
import { buildPlantFromAnalysis } from "./lib/build-plant.mjs";
import { buildFloorLampFromAnalysis } from "./lib/build-floor-lamp.mjs";
import { buildTvStandFromAnalysis } from "./lib/build-tv-stand.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const GLB = path.join(ROOT, "public/apt/glb/hero-assets");

async function rebuild(id, buildFn, analysisPath, outName) {
  const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
  const { root, GLTFExporter } = await buildFn(analysis);
  const buf = await exportGlb(GLTFExporter, root);
  const out = path.join(GLB, outName);
  fs.writeFileSync(out, buf);
  console.log("wrote", out);
}

await rebuild(
  "sofa",
  buildSofaFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/sofa/v6/shape-analysis.json"),
  "sofa-v6.glb",
);
await rebuild(
  "plant",
  buildPlantFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/plant/v1/shape-analysis.json"),
  "plant-v1.glb",
);
await rebuild(
  "floor-lamp",
  buildFloorLampFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/floor-lamp/v1/shape-analysis.json"),
  "floor-lamp-v1.glb",
);
await rebuild(
  "tv-stand",
  buildTvStandFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/tv-stand/v1/shape-analysis.json"),
  "tv-stand-v1.glb",
);

console.log("Scene Polish #2 GLB rebuild complete");
