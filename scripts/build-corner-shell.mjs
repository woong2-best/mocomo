/**
 * CS-01 Corner Shell — direct production (Style Lock § CS-01)
 * Output: public/apt/glb/corner-sample/cs-01-corner-shell.glb
 */
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  };
}

const THREE = await import("three");
const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
const fsMod = await import("fs");
const pathMod = await import("path");
const { fileURLToPath } = await import("url");
const fs = fsMod.default;
const path = pathMod.default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/apt/glb/corner-sample/cs-01-corner-shell.glb");

const SCALE = 0.88;
const FLOOR_W = 3.2 * SCALE;
const FLOOR_D = 2.8 * SCALE;
const WALL_H = 2.5 * SCALE;
const WALL_T = 0.15 * SCALE;
const BASEBOARD_H = 0.09 * SCALE;
const BASEBOARD_P = 0.012 * SCALE;
const WINDOW_RECESS = 0.2 * SCALE;

function mat(name, hex, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    name,
    color: new THREE.Color(hex),
    roughness,
    metalness,
  });
}

function box(w, h, d, material, x, y, z, rx = 0.004) {
  const geo = new RoundedBoxGeometry(w, h, d, 2, rx);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function plankFloor(group) {
  const plankMat = mat("floor_oak", "#E8C9A0", 0.72);
  const plankW = 0.22 * SCALE;
  const count = Math.ceil(FLOOR_D / plankW);
  for (let i = 0; i < count; i++) {
    const z = plankW * i + plankW / 2;
    group.add(box(FLOOR_W, 0.028 * SCALE, plankW * 0.96, plankMat, FLOOR_W / 2, 0, z, 0.003));
  }
}

function buildShell() {
  const root = new THREE.Group();
  root.name = "cs-01-corner-shell";

  const wallMat = mat("wall_cream", "#FAF6F0", 0.82);
  const capMat = mat("cutaway_cap", "#4A4038", 0.78);
  const baseMat = mat("baseboard", "#EDE4D8", 0.8);

  plankFloor(root);
  root.add(box(FLOOR_W, WALL_H, WALL_T, wallMat, FLOOR_W / 2, 0, -WALL_T / 2, 0.006));
  root.add(box(WALL_T, WALL_H, FLOOR_D, wallMat, -WALL_T / 2, 0, FLOOR_D / 2, 0.006));
  root.add(box(FLOOR_W, BASEBOARD_H, BASEBOARD_P, baseMat, FLOOR_W / 2, 0, BASEBOARD_P / 2, 0.003));
  root.add(box(BASEBOARD_P, BASEBOARD_H, FLOOR_D, baseMat, BASEBOARD_P / 2, 0, FLOOR_D / 2, 0.003));

  const winW = 0.9 * SCALE;
  const winH = 1.1 * SCALE;
  const winY = 0.95 * SCALE;
  const winZ = FLOOR_D * 0.62;
  root.add(
    box(WALL_T + WINDOW_RECESS, winH, winW, mat("window_recess", "#E8E0D4", 0.88), -WINDOW_RECESS / 2, winY, winZ, 0.004),
  );
  root.add(
    box(WALL_T + 0.002, winH + 0.06 * SCALE, winW + 0.06 * SCALE, mat("window_frame", "#D4C4B0", 0.75), -WALL_T / 2 - 0.001, winY, winZ, 0.003),
  );

  const capH = 0.06 * SCALE;
  root.add(box(FLOOR_W, capH, WALL_T, capMat, FLOOR_W / 2, WALL_H, -WALL_T / 2, 0.004));
  root.add(box(WALL_T, capH, FLOOR_D, capMat, -WALL_T / 2, WALL_H, FLOOR_D / 2, 0.004));
  root.add(box(WALL_T, capH, WALL_T, capMat, -WALL_T / 2, WALL_H, -WALL_T / 2, 0.004));

  return root;
}

function exportGlb(object) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        fs.mkdirSync(path.dirname(OUT), { recursive: true });
        fs.writeFileSync(OUT, Buffer.from(result));
        resolve(OUT);
      },
      (err) => reject(err),
      { binary: true },
    );
  });
}

const shell = buildShell();
const out = await exportGlb(shell);
console.log("Wrote", out, `(${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
