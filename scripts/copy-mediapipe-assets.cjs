/**
 * MediaPipe Face Landmarker — WASM·모델을 public/ 에 복사 (CSP·CDN 의존 제거)
 */
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const root = join(__dirname, "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = join(root, "public", "mediapipe", "wasm");
const modelDest = join(root, "public", "mediapipe", "models", "face_landmarker.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function copyDirSync(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(from, to);
    else copyFileSync(from, to);
  }
}

function copyWasm() {
  if (!existsSync(wasmSrc)) {
    console.warn("[mediapipe] wasm source missing — skip copy (run npm install first)");
    return false;
  }
  copyDirSync(wasmSrc, wasmDest);
  console.log("[mediapipe] wasm copied to public/mediapipe/wasm");
  return true;
}

async function downloadModel() {
  if (existsSync(modelDest)) {
    console.log("[mediapipe] model already present");
    return true;
  }
  mkdirSync(dirname(modelDest), { recursive: true });
  try {
    const res = await fetch(modelUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(modelDest, buf);
    console.log("[mediapipe] model downloaded to public/mediapipe/models/");
    return true;
  } catch (e) {
    console.warn("[mediapipe] model download failed — will use remote URL at runtime:", e);
    return false;
  }
}

async function main() {
  copyWasm();
  await downloadModel();
}

main().catch((e) => {
  console.warn("[mediapipe] asset setup failed:", e);
});
