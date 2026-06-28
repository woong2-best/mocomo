import { loadThree, shapeMat, roundedBox, TOY_PROPORTION } from "../../lib/gltf-export.mjs";

/** v1 — Bondee toy proportion: stubby legs, thick top slab */
function buildV1(THREE, RoundedBoxGeometry, analysis, wood) {
  const m = analysis.meters;
  const T = TOY_PROPORTION;
  const root = new THREE.Group();
  const W = m.overallWidth;
  const D = m.overallDepth;
  const topT = m.topThickness * T.top;
  const legH = m.legHeight * T.leg;
  const legS = m.legSize * 1.06;
  const inset = m.legInset * 0.92;
  const bevel = Math.max(m.topBevelRadius * 1.28, 0.014);
  const legBevel = Math.min(bevel * 0.8, legS * 0.32);
  const splay = THREE.MathUtils.degToRad(8);

  const top = roundedBox(THREE, RoundedBoxGeometry, W, topT, D, wood, bevel);
  top.position.y = legH + topT / 2;
  root.add(top);

  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const leg = roundedBox(THREE, RoundedBoxGeometry, legS, legH, legS, wood, legBevel);
    leg.position.set(sx * (W / 2 - inset), legH / 2, sz * (D / 2 - inset));
    leg.rotation.x = sz * splay;
    leg.rotation.z = -sx * splay;
    root.add(leg);
  }

  return root;
}

function pickBuilder(version) {
  if (version >= 1) return buildV1;
  return buildV1;
}

export async function buildCoffeeTableFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const wood = shapeMat(THREE, "wood_shape");

  const root = pickBuilder(version)(THREE, RoundedBoxGeometry, analysis, wood);
  root.name = `coffee-table-v${version}`;

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());

  return {
    root,
    GLTFExporter,
    measured: {
      meshWidth: size.x,
      meshHeight: size.y,
      meshDepth: size.z,
      overallWidth: size.x,
      overallDepth: size.z,
      overallHeight: size.y,
      topThickness: analysis.meters.topThickness,
      legHeight: analysis.meters.legHeight,
      legSize: analysis.meters.legSize,
      topBevelRadius: analysis.meters.topBevelRadius,
      legCount: analysis.counts.legCount,
    },
  };
}
