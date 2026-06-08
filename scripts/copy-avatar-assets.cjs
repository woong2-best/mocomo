/**
 * 기본 VRM 아바타 — public/avatars/ 에 다운로드 (3D 스튜디오)
 */
const { createWriteStream, existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { get } = require("node:https");

const root = join(__dirname, "..");
const destDir = join(root, "public", "avatars");
const dest = join(destDir, "default.vrm");
const url =
  "https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`VRM download failed: ${res.statusCode}`));
        return;
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  if (existsSync(dest)) {
    console.log("[avatar] default.vrm already present");
  } else {
    mkdirSync(destDir, { recursive: true });
    await download(url, dest);
    console.log("[avatar] default.vrm downloaded to public/avatars/");
  }

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

main().catch((e) => {
  console.warn("[avatar] VRM download skipped:", e.message);
});
