import { loadThree, shapeMat, roundedBox, SCENE_LANGUAGE, TOY_PROPORTION } from "../../lib/gltf-export.mjs";

/** v1 — Bondee toy proportion TV stand */
function buildV1(THREE, RoundedBoxGeometry, analysis) {
  const m = analysis.meters;
  const T = TOY_PROPORTION;
  const root = new THREE.Group();
  const B = SCENE_LANGUAGE.bevelWood;
  const bProp = SCENE_LANGUAGE.bevelProp;

  const wood = shapeMat(THREE, "cabinet_shape");
  const bezel = shapeMat(THREE, "tv_bezel");
  const screen = shapeMat(THREE, "tv_graybox");

  const legH = m.legHeight * T.leg * 0.92;
  const cabH = m.cabinetHeight * 0.9 * T.body;
  const legS = 0.052;

  for (const [lx, lz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const leg = roundedBox(THREE, RoundedBoxGeometry, legS, legH, legS, wood, B * 0.85);
    leg.position.set(lx * (m.cabinetWidth / 2 - 0.11), legH / 2, lz * (m.cabinetDepth / 2 - 0.09));
    root.add(leg);
  }

  const cabinet = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.cabinetWidth * 1.02,
    cabH * 1.02,
    m.cabinetDepth * 1.02,
    wood,
    B * 1.12,
  );
  cabinet.position.y = legH + cabH / 2;
  root.add(cabinet);

  const topBoard = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.cabinetWidth * 0.94,
    0.042,
    m.cabinetDepth * 0.9,
    wood,
    B * 0.95,
  );
  topBoard.position.y = legH + cabH + 0.011;
  root.add(topBoard);

  const tvW = m.tvWidth * 0.78;
  const tvH = m.tvHeight * 0.76;
  const tvD = Math.max(m.tvThickness, 0.038);
  const tvY = legH + cabH + tvH / 2 + 0.028;

  const frame = roundedBox(THREE, RoundedBoxGeometry, tvW, tvH, tvD, bezel, B * 1.15);
  frame.position.set(0, tvY, -m.cabinetDepth * 0.06);
  frame.rotation.x = -0.04;
  root.add(frame);

  const panel = roundedBox(
    THREE,
    RoundedBoxGeometry,
    tvW * 0.86,
    tvH * 0.82,
    tvD * 0.55,
    screen,
    bProp,
  );
  panel.position.set(0, tvY + tvH * 0.01, -m.cabinetDepth * 0.06 + tvD * 0.22);
  panel.rotation.x = -0.04;
  root.add(panel);

  const chin = roundedBox(
    THREE,
    RoundedBoxGeometry,
    tvW * 0.18,
    tvH * 0.06,
    tvD * 0.7,
    bezel,
    bProp,
  );
  chin.position.set(0, tvY - tvH * 0.44, -m.cabinetDepth * 0.06 + tvD * 0.12);
  chin.rotation.x = -0.04;
  root.add(chin);

  return root;
}

export async function buildTvStandFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const root = buildV1(THREE, RoundedBoxGeometry, analysis);
  root.name = `tv-stand-v${version}`;

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const meters = analysis.meters;

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
      cabinetHeight: meters.cabinetHeight,
      tvWidth: meters.tvWidth,
      tvHeight: meters.tvHeight,
    },
  };
}
