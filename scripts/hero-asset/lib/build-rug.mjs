import { loadThree, shapeMat, roundedBox, SCENE_LANGUAGE } from "../../lib/gltf-export.mjs";

/** Bondee negative shape — puffy slab + soft corner curls */
function buildV1(THREE, RoundedBoxGeometry, analysis, fabric) {
  const m = analysis.meters;
  const root = new THREE.Group();
  const W = m.overallWidth;
  const D = m.overallDepth;
  const T = Math.max(m.overallHeight * 2.8, 0.012);
  const corner = Math.min(W, D) * 0.16;

  const rug = roundedBox(THREE, RoundedBoxGeometry, W, T, D, fabric, Math.min(corner, W * 0.18, D * 0.18));
  rug.position.y = T / 2;
  root.add(rug);

  const curlDefs = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (const [sx, sz] of curlDefs) {
    const curl = roundedBox(
      THREE,
      RoundedBoxGeometry,
      W * 0.14,
      T * 0.55,
      D * 0.14,
      fabric,
      SCENE_LANGUAGE.bevelPlush * 0.45,
    );
    curl.position.set(sx * (W / 2 - W * 0.05), T * 0.42, sz * (D / 2 - D * 0.05));
    curl.rotation.y = sx * sz * 0.18;
    root.add(curl);
  }

  return root;
}

export async function buildRugFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const fabric = shapeMat(THREE, "rug_shape");
  fabric.color.set("#C8BEB4");

  const root = buildV1(THREE, RoundedBoxGeometry, analysis, fabric);
  root.name = `rug-v${version}`;

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
      edgeBevelRadius: analysis.meters.edgeBevelRadius,
      cornerRadius: analysis.meters.cornerRadius,
    },
  };
}
