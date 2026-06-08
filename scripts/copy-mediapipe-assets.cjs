/**
 * MediaPipe Face / Pose / Hand Landmarker — WASM·모델을 public/ 에 복사
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
const modelsDir = join(root, "public", "mediapipe", "models");

const MODELS = [
  {
    dest: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  },
  {
    dest: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  {
    dest: "hand_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  },
];

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

async function downloadModel(destName, url) {
  const dest = join(modelsDir, destName);
  if (existsSync(dest)) {
    console.log(`[mediapipe] ${destName} already present`);
    return true;
  }
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`[mediapipe] ${destName} downloaded`);
    return true;
  } catch (e) {
    console.warn(`[mediapipe] ${destName} download failed — remote URL at runtime:`, e.message);
    return false;
  }
}

async function main() {
  copyWasm();
  for (const { dest, url } of MODELS) {
    await downloadModel(dest, url);
  }
}

main().catch((e) => {
  console.warn("[mediapipe] asset setup failed:", e);
});
