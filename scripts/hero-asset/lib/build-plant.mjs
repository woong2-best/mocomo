import { loadThree, shapeMat, roundedBox, SCENE_LANGUAGE } from "../../lib/gltf-export.mjs";

/** Bondee rounded language — chubby pot + soft leaves */
function buildV1(THREE, RoundedBoxGeometry, analysis) {
  const m = analysis.meters;
  const leafCount = analysis.counts.leafCount;
  const root = new THREE.Group();
  const P = SCENE_LANGUAGE.bevelPlush;
  const B = SCENE_LANGUAGE.bevelWood;

  const potMat = shapeMat(THREE, "pot_shape");
  const leafMat = shapeMat(THREE, "leaf_shape");

  const potH = m.potHeight * 0.68;
  const potW = m.potTopRadius * 2.72;
  const pot = roundedBox(THREE, RoundedBoxGeometry, potW, potH, potW, potMat, B * 1.75);
  pot.position.y = potH / 2;
  root.add(pot);

  const soil = roundedBox(
    THREE,
    RoundedBoxGeometry,
    potW * 0.82,
    0.014,
    potW * 0.78,
    potMat,
    0.006,
  );
  soil.position.y = potH - 0.005;
  root.add(soil);

  const baseY = potH + 0.02;
  const spread = m.foliageSpread * 0.48;
  for (let i = 0; i < leafCount; i++) {
    const t = i / Math.max(leafCount - 1, 1);
    const ang = THREE.MathUtils.lerp(-1.0, 1.0, t);
    const tilt = THREE.MathUtils.lerp(0.3, 0.68, Math.abs(t - 0.5) * 2);
    const len = m.leafLength * (0.95 + (i % 3) * 0.08);
    const wid = m.leafWidth * (1.0 + (i % 2) * 0.1);
    const leaf = roundedBox(THREE, RoundedBoxGeometry, wid * 1.08, len * 0.42, len * 1.05, leafMat, wid * 0.55);
    leaf.position.set(
      Math.sin(ang) * spread * 0.62,
      baseY + len * tilt * 0.4,
      Math.cos(ang) * spread * 0.5,
    );
    leaf.rotation.x = -tilt;
    leaf.rotation.y = ang * 0.7;
    leaf.rotation.z = (i - leafCount / 2) * 0.1;
    root.add(leaf);
  }

  const crown = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.foliageSpread * 0.54,
    m.foliageHeight * 0.34,
    m.foliageSpread * 0.48,
    leafMat,
    P,
  );
  crown.position.y = baseY + m.foliageHeight * 0.36;
  root.add(crown);

  return root;
}

export async function buildPlantFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const root = buildV1(THREE, RoundedBoxGeometry, analysis);
  root.name = `plant-v${version}`;

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
      potHeight: analysis.meters.potHeight,
      foliageSpread: analysis.meters.foliageSpread,
      leafCount: analysis.counts.leafCount,
    },
  };
}
