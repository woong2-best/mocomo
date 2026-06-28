import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadThree, exportGlb, shapeMat, roundedBox } from "../lib/gltf-export.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../../public/apt/corner-sample/sofa");
const GLB_OUT = path.join(__dirname, "../../public/apt/glb/corner-sample/cs-02-sofa-v2.glb");

export function loadSofaAnalysis() {
  return JSON.parse(fs.readFileSync(path.join(OUT_DIR, "shape-analysis.json"), "utf8"));
}

export async function buildSofaFromAnalysis(analysis) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const m = analysis.meters;
  const fabric = shapeMat(THREE, "fabric_shape");
  const wood = shapeMat(THREE, "wood_shape");

  const root = new THREE.Group();
  root.name = "cs-02-sofa-v2";

  const W = m.overallWidth;
  const D = m.overallDepth;
  const H = m.overallHeight;
  const armW = m.armWidth;
  const backT = m.backThickness;
  const legH = m.legHeight;
  const legR = m.legThickness / 2;
  const gap = m.cushionGap;
  const innerW = W - armW * 2;
  const seatH = m.seatCushionHeight;
  const backH = m.backCushionHeight;
  const seatD = D - backT - 0.035;
  const seatCount = analysis.counts.seatCushions;
  const backCount = analysis.counts.backCushions;
  const cushionW = (innerW - gap * (seatCount - 1)) / seatCount;
  const backCushionW = (innerW - gap * (backCount - 1)) / backCount;

  const chassis = roundedBox(THREE, RoundedBoxGeometry, W - 0.05, 0.04, D - 0.05, wood, m.cornerRadius * 0.25);
  chassis.position.set(0, legH + 0.02, 0);
  root.add(chassis);

  for (const [lx, lz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(legR, legR * 0.9, legH, 16),
      wood,
    );
    leg.position.set(lx * (W / 2 - m.legOffsetX), legH / 2, lz * (D / 2 - m.legOffsetZ));
    root.add(leg);
  }

  for (let i = 0; i < seatCount; i++) {
    const cx = -innerW / 2 + cushionW / 2 + i * (cushionW + gap);
    const puff = m.cushionRadius * 1.15;
    const seat = roundedBox(THREE, RoundedBoxGeometry, cushionW, seatH, seatD, fabric, puff);
    seat.position.set(cx, legH + seatH / 2 + 0.008, backT / 2 + 0.025);
    root.add(seat);
  }

  for (let i = 0; i < backCount; i++) {
    const cx = -innerW / 2 + backCushionW / 2 + i * (backCushionW + gap);
    const puff = m.cushionRadius * 1.2;
    const back = roundedBox(THREE, RoundedBoxGeometry, backCushionW, backH, backT, fabric, puff);
    back.position.set(cx, legH + seatH + backH / 2 - 0.015, -D / 2 + backT / 2 + 0.008);
    root.add(back);
  }

  for (const sx of [-1, 1]) {
    const arm = roundedBox(
      THREE,
      RoundedBoxGeometry,
      armW,
      H - legH + 0.025,
      D - 0.05,
      fabric,
      m.armRadius,
    );
    arm.position.set(sx * (W / 2 - armW / 2), legH + (H - legH) / 2, 0.012);
    root.add(arm);
  }

  return { root, THREE, GLTFExporter, metrics: measureMetrics(root, THREE, m) };
}

function measureMetrics(root, THREE, target) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  return {
    width: size.x,
    height: size.y,
    depth: size.z,
    volume: size.x * size.y * size.z,
    target,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("build-sofa-v2.mjs")) {
  const analysis = loadSofaAnalysis();
  const { root, GLTFExporter } = await buildSofaFromAnalysis(analysis);
  const buf = await exportGlb(GLTFExporter, root);
  fs.mkdirSync(path.dirname(GLB_OUT), { recursive: true });
  fs.writeFileSync(GLB_OUT, buf);
  console.log("Wrote", GLB_OUT, `(${(buf.length / 1024).toFixed(1)} KB)`);
}
