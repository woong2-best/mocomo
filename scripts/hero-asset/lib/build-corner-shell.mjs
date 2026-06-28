import { loadThree, shapeMat, roundedBox, SCENE_LANGUAGE } from "../../lib/gltf-export.mjs";

/** v1 — soft negative space: rounded trim + window recess */
function buildV1(THREE, RoundedBoxGeometry, analysis) {
  const m = analysis.meters;
  const root = new THREE.Group();
  root.name = "corner-shell-root";
  const A = SCENE_LANGUAGE.bevelArch;

  const floorMat = shapeMat(THREE, "floor_plank");
  floorMat.color.set("#C8B8A8");
  const wallMat = shapeMat(THREE, "wall_shape");
  wallMat.color.set("#E8E0D8");
  const trimMat = shapeMat(THREE, "baseboard");
  trimMat.color.set("#D8D0C8");
  const capMat = shapeMat(THREE, "cutaway_cap");
  capMat.color.set("#8A8078");
  const windowMat = shapeMat(THREE, "window_recess");
  windowMat.color.set("#C8D8E8");

  const hw = m.floorWidth / 2;
  const hd = m.floorDepth / 2;
  const wt = m.wallThickness;
  const wh = m.wallHeight;

  const floor = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.floorWidth,
    m.floorThickness,
    m.floorDepth,
    floorMat,
    A,
  );
  floor.position.y = m.floorThickness / 2;
  root.add(floor);

  const wallLeft = roundedBox(THREE, RoundedBoxGeometry, wt, wh, m.floorDepth, wallMat, A * 1.2);
  wallLeft.position.set(-hw + wt / 2, wh / 2 + m.floorThickness, 0);
  root.add(wallLeft);

  const wallBack = roundedBox(THREE, RoundedBoxGeometry, m.floorWidth, wh, wt, wallMat, A * 1.2);
  wallBack.position.set(0, wh / 2 + m.floorThickness, -hd + wt / 2);
  root.add(wallBack);

  const windowOpening = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.windowRecess + 0.04,
    m.windowHeight,
    m.windowWidth,
    windowMat,
    A * 2.5,
  );
  windowOpening.position.set(-hw + m.windowRecess / 2 + 0.02, m.windowSillY + m.windowHeight / 2, -0.15);
  root.add(windowOpening);

  const baseboardLeft = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.baseboardProjection,
    m.baseboardHeight,
    m.floorDepth - wt * 0.5,
    trimMat,
    A * 2,
  );
  baseboardLeft.position.set(-hw + wt + m.baseboardProjection / 2, m.baseboardHeight / 2 + m.floorThickness, 0.05);
  root.add(baseboardLeft);

  const baseboardBack = roundedBox(
    THREE,
    RoundedBoxGeometry,
    m.floorWidth - wt * 0.5,
    m.baseboardHeight,
    m.baseboardProjection,
    trimMat,
    A * 2,
  );
  baseboardBack.position.set(0.05, m.baseboardHeight / 2 + m.floorThickness, -hd + wt + m.baseboardProjection / 2);
  root.add(baseboardBack);

  const capH = m.cutawayCapHeight;
  const capFront = roundedBox(THREE, RoundedBoxGeometry, m.floorWidth, capH, wt * 0.6, capMat, A);
  capFront.position.set(0, wh + capH / 2 + m.floorThickness, hd - wt * 0.3);
  root.add(capFront);

  const capSide = roundedBox(THREE, RoundedBoxGeometry, wt * 0.6, capH, m.floorDepth, capMat, A);
  capSide.position.set(hw - wt * 0.3, wh + capH / 2 + m.floorThickness, 0);
  root.add(capSide);

  return root;
}

export async function buildCornerShellFromAnalysis(analysis, version = 1) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const root = buildV1(THREE, RoundedBoxGeometry, analysis);
  root.name = `corner-shell-v${version}`;

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());

  return {
    root,
    GLTFExporter,
    measured: {
      meshWidth: size.x,
      meshHeight: size.y,
      meshDepth: size.z,
      floorWidth: analysis.meters.floorWidth,
      wallHeight: analysis.meters.wallHeight,
    },
  };
}
