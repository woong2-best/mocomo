import { loadThree, shapeMat, roundedBox, SCENE_LANGUAGE, TOY_PROPORTION } from "../../lib/gltf-export.mjs";

/** Bondee toy proportion — short lamp, fat base/shade */
function buildV1(THREE, RoundedBoxGeometry, analysis) {
  const m = analysis.meters;
  const T = TOY_PROPORTION;
  const root = new THREE.Group();
  const B = SCENE_LANGUAGE.bevelWood;
  const P = SCENE_LANGUAGE.bevelPlush;

  const baseMat = shapeMat(THREE, "base_shape");
  const poleMat = shapeMat(THREE, "pole_shape");
  const shadeMat = shapeMat(THREE, "shade_shape");

  const baseH = m.baseHeight * 1.18;
  const baseD = m.baseDiameter * 1.22;
  const base = roundedBox(THREE, RoundedBoxGeometry, baseD, baseH, baseD, baseMat, B * 1.75);
  base.position.y = baseH / 2;
  root.add(base);

  const poleH = (m.overallHeight - baseH - m.shadeHeight * 0.82) * 0.68 * T.leg;
  const poleW = m.poleRadius * 3.35;
  const pole = roundedBox(THREE, RoundedBoxGeometry, poleW, poleH, poleW, poleMat, B * 1.25);
  pole.position.y = baseH + poleH / 2;
  root.add(pole);

  const shadeY = baseH + poleH + (m.shadeHeight * 1.12) / 2;
  const shadeW = m.shadeBottomRadius * 2.5;
  const shadeTopW = m.shadeTopRadius * 2.15;
  const shade = roundedBox(THREE, RoundedBoxGeometry, shadeW, m.shadeHeight * 1.14, shadeW, shadeMat, P * 1.18);
  shade.scale.set(shadeTopW / shadeW, 1, shadeTopW / shadeW);
  shade.position.y = shadeY;
  root.add(shade);

  const shadeCap = roundedBox(
    THREE,
    RoundedBoxGeometry,
    shadeW * 0.92,
    m.shadeHeight * 0.2,
    shadeW * 0.92,
    shadeMat,
    P * 0.9,
  );
  shadeCap.position.y = shadeY - m.shadeHeight * 0.36;
  root.add(shadeCap);

  return root;
}

export async function buildFloorLampFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const root = buildV1(THREE, RoundedBoxGeometry, analysis);
  root.name = `floor-lamp-v${version}`;

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
      overallHeight: size.y,
      baseDiameter: meters.baseDiameter,
      baseHeight: meters.baseHeight,
      poleRadius: meters.poleRadius,
      shadeHeight: meters.shadeHeight,
    },
  };
}
