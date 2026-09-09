/**
 * MapLibre GL JS v6 worker — Next.js/Turbopack cannot bundle the worker sibling import.
 * Copy worker + shared chunk to public/ so setWorkerUrl() can load tiles.
 */
const { copyFileSync, existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const srcDir = join(root, "node_modules", "maplibre-gl", "dist");
const destDir = join(root, "public", "maplibre");

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

function main() {
  if (!existsSync(srcDir)) {
    console.warn("[copy-maplibre-worker] maplibre-gl not installed, skipping");
    return;
  }
  mkdirSync(destDir, { recursive: true });
  for (const file of FILES) {
    const from = join(srcDir, file);
    const to = join(destDir, file);
    if (!existsSync(from)) {
      throw new Error(`[copy-maplibre-worker] missing ${from}`);
    }
    copyFileSync(from, to);
  }
  console.log("[copy-maplibre-worker] copied worker assets to public/maplibre/");
}

main();
