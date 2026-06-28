/**
 * Style Lock material pass — KayKit GLB → solid PBR palette (APT_STYLE_LOCK.md)
 */
import { NodeIO } from "@gltf-transform/core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "../public/apt/glb/corner-sample");

const MINI_SCALE = 0.88;

const ASSETS = {
  "cs-02-sofa.glb": { color: "#D4C4B0", roughness: 0.88, metalness: 0 },
  "cs-03-rug.glb": { color: "#E8DDD0", roughness: 0.92, metalness: 0 },
  "cs-04-coffee-table.glb": { color: "#C9956A", roughness: 0.7, metalness: 0 },
  "cs-05-plant.glb": { color: "#9BB89A", roughness: 0.85, metalness: 0 },
  "cs-06-floor-lamp.glb": { color: "#FAF0E0", roughness: 0.9, metalness: 0.05 },
  "cs-07-tv-stand.glb": { color: "#C9956A", roughness: 0.68, metalness: 0 },
};

function hexToFactor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

async function styleLockFile(io, filename, spec) {
  const filePath = path.join(DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn("Skip (missing):", filename);
    return;
  }

  const doc = await io.read(filePath);
  const root = doc.getRoot();

  for (const mat of root.listMaterials()) {
    mat.setBaseColorFactor(hexToFactor(spec.color));
    mat.setRoughnessFactor(spec.roughness);
    mat.setMetallicFactor(spec.metalness);
    mat.setBaseColorTexture(null);
    mat.setMetallicRoughnessTexture(null);
    mat.setNormalTexture(null);
    mat.setOcclusionTexture(null);
    mat.setEmissiveTexture(null);
  }

  for (const scene of root.listScenes()) {
    for (const node of scene.listChildren()) {
      const s = node.getScale();
      node.setScale([s[0] * MINI_SCALE, s[1] * MINI_SCALE, s[2] * MINI_SCALE]);
    }
  }

  await io.write(filePath, doc);
  const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`Styled ${filename} → ${spec.color} r=${spec.roughness} (${kb} KB)`);
}

const io = new NodeIO();
for (const [file, spec] of Object.entries(ASSETS)) {
  await styleLockFile(io, file, spec);
}
console.log("Style Lock pass complete.");
