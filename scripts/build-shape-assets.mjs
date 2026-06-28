/**
 * Priority 1 — Shape Language meshes (Style Lock dimensions, reference silhouette)
 * KayKit is NOT used. Neutral gray material for shape evaluation only.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadThree, exportGlb, shapeMat, roundedBox } from "./lib/gltf-export.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../public/apt/glb/corner-sample");

const S = 0.88;

function group(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

let THREE, GLTFExporter, RoundedBoxGeometry;
({ THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree());

function buildSofa() {
  const root = group("cs-02-sofa-shape");
  const fabric = shapeMat(THREE, "fabric_shape");
  const wood = shapeMat(THREE, "wood_shape");

  const W = 2.1 * S;
  const D = 0.9 * S;
  const H = 0.82 * S;
  const armW = 0.14 * S;
  const backT = 0.18 * S;
  const legH = 0.12 * S;
  const legR = 0.03 * S;
  const gap = 0.02 * S;
  const armBevel = 0.022 * S;

  const innerW = W - armW * 2;
  const seatH = 0.13 * S;
  const backH = H - legH - seatH;
  const seatD = D - backT - 0.04 * S;
  const cushionW = (innerW - gap) / 2;

  // Chassis slab
  const chassis = roundedBox(
    THREE,
    RoundedBoxGeometry,
    W - 0.04 * S,
    0.045 * S,
    D - 0.04 * S,
    wood,
    0.012 * S,
  );
  chassis.position.set(0, legH + 0.022 * S, 0);
  root.add(chassis);

  // Legs — short pegs, inset from corners
  const legInsetX = armW * 0.55;
  const legInsetZ = 0.12 * S;
  for (const [lx, lz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legR, legR * 0.92, legH, 12),
      wood,
    );
    leg.position.set(lx * (W / 2 - legInsetX), legH / 2, lz * (D / 2 - legInsetZ));
    root.add(leg);
  }

  // Seat cushions — 2 separated, puffy
  for (let i = 0; i < 2; i++) {
    const cx = -innerW / 2 + cushionW / 2 + i * (cushionW + gap);
    const seat = roundedBox(THREE, RoundedBoxGeometry, cushionW, seatH, seatD, fabric, 0.035 * S);
    seat.position.set(cx, legH + seatH / 2 + 0.01 * S, backT / 2 + 0.02 * S);
    root.add(seat);
  }

  // Back cushions — 2, thick rounded
  for (let i = 0; i < 2; i++) {
    const cx = -innerW / 2 + cushionW / 2 + i * (cushionW + gap);
    const back = roundedBox(THREE, RoundedBoxGeometry, cushionW, backH, backT, fabric, 0.04 * S);
    back.position.set(cx, legH + seatH + backH / 2 - 0.02 * S, -D / 2 + backT / 2 + 0.01 * S);
    root.add(back);
  }

  // Armrests — thick, rounded top
  for (const sx of [-1, 1]) {
    const arm = roundedBox(THREE, RoundedBoxGeometry, armW, H - legH + 0.02 * S, D - 0.06 * S, fabric, armBevel);
    arm.position.set(sx * (W / 2 - armW / 2), legH + (H - legH) / 2, 0.01 * S);
    root.add(arm);
  }

  return root;
}

function buildCoffeeTable() {
  const root = group("cs-04-coffee-table-shape");
  const wood = shapeMat(THREE, "wood_shape");

  const topW = 0.9 * S;
  const topD = 0.5 * S;
  const topT = 0.035 * S;
  const legH = 0.38 * S;
  const leg = 0.04 * S;

  const top = roundedBox(THREE, RoundedBoxGeometry, topW, topT, topD, wood, 0.012 * S);
  top.position.set(0, legH + topT / 2, 0);
  root.add(top);

  const insetX = topW / 2 - leg * 1.8;
  const insetZ = topD / 2 - leg * 1.8;
  for (const [lx, lz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const legMesh = roundedBox(THREE, RoundedBoxGeometry, leg, legH, leg, wood, leg * 0.35);
    legMesh.position.set(lx * insetX, legH / 2, lz * insetZ);
    root.add(legMesh);
  }

  return root;
}

function buildRug() {
  const root = group("cs-03-rug-shape");
  const fabric = shapeMat(THREE, "rug_shape");

  const w = 1.55 * S;
  const d = 1.1 * S;
  const t = 0.012 * S;

  const rug = roundedBox(THREE, RoundedBoxGeometry, w, t, d, fabric, 0.006 * S);
  rug.position.set(0, t / 2, 0);
  root.add(rug);

  return root;
}

async function writeShape(name, object) {
  const buf = await exportGlb(GLTFExporter, object);
  const file = path.join(OUT, name);
  fs.writeFileSync(file, buf);
  console.log(`Wrote ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

fs.mkdirSync(OUT, { recursive: true });
await writeShape("cs-02-sofa-shape.glb", buildSofa());
await writeShape("cs-04-coffee-table-shape.glb", buildCoffeeTable());
await writeShape("cs-03-rug-shape.glb", buildRug());
console.log("Shape Language assets complete.");
