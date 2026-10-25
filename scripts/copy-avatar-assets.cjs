/**
 * Avatar part folders under public/avatars/parts.
 * Live/studio defaults are the committed slot files (zelie.vrm etc), not the old APT sample.
 */
const { existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const destDir = join(__dirname, "..", "public", "avatars");

function main() {
  mkdirSync(destDir, { recursive: true });
  const partsRoot = join(destDir, "parts");
  const categories = ["hair", "top", "bottom", "fullOutfit", "shoes", "headwear", "accessory"];
  categories.forEach((cat) => {
    const dir = join(partsRoot, cat);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`[avatar] parts/${cat}/ ready (GLB optional — procedural fallback)`);
    }
  });
}

try {
  main();
} catch (e) {
  console.warn("[avatar] parts folders skipped:", e instanceof Error ? e.message : e);
}
