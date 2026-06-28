import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exportGlb } from "../lib/gltf-export.mjs";
import { buildSofaFromAnalysis } from "./lib/build-sofa.mjs";
import { buildCoffeeTableFromAnalysis } from "./lib/build-coffee-table.mjs";
import { buildRugFromAnalysis } from "./lib/build-rug.mjs";
import { buildPlantFromAnalysis } from "./lib/build-plant.mjs";
import { buildFloorLampFromAnalysis } from "./lib/build-floor-lamp.mjs";
import { buildTvStandFromAnalysis } from "./lib/build-tv-stand.mjs";
import { buildCornerShellFromAnalysis } from "./lib/build-corner-shell.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const GLB = path.join(ROOT, "public/apt/glb/hero-assets");

async function rebuild(buildFn, analysisPath, outName) {
  const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
  const { root, GLTFExporter } = await buildFn(analysis);
  fs.writeFileSync(path.join(GLB, outName), await exportGlb(GLTFExporter, root));
  console.log("wrote", path.join(GLB, outName));
}

await rebuild(
  buildCornerShellFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/corner-shell/v1/shape-analysis.json"),
  "corner-shell-v1.glb",
);
await rebuild(
  buildRugFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/rug/v1/shape-analysis.json"),
  "rug-v1.glb",
);
await rebuild(
  buildSofaFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/sofa/v6/shape-analysis.json"),
  "sofa-v6.glb",
);
await rebuild(
  buildCoffeeTableFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/coffee-table/v1/shape-analysis.json"),
  "coffee-table-v1.glb",
);
await rebuild(
  buildPlantFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/plant/v1/shape-analysis.json"),
  "plant-v1.glb",
);
await rebuild(
  buildFloorLampFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/floor-lamp/v1/shape-analysis.json"),
  "floor-lamp-v1.glb",
);
await rebuild(
  buildTvStandFromAnalysis,
  path.join(ROOT, "public/apt/hero-assets/tv-stand/v1/shape-analysis.json"),
  "tv-stand-v1.glb",
);

console.log("Scene Polish #4 GLB rebuild complete");
