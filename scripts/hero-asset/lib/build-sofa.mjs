import { loadThree, exportGlb, shapeMat, roundedBox, TOY_PROPORTION } from "../../lib/gltf-export.mjs";

/** v6 polish #4 — single marshmallow volume, Bondee toy proportion */
function buildV6(THREE, RoundedBoxGeometry, analysis, fabric, wood) {
  const m = analysis.meters;
  const T = TOY_PROPORTION;
  const root = new THREE.Group();
  const W = m.overallWidth * 1.12 * T.body;
  const D = m.overallDepth * 1.08 * T.body;
  const innerW = W - m.armWidth * 1.22 * 2;

  const legH = 0.005;
  const totalH = 0.452 * T.body;
  const backTilt = THREE.MathUtils.degToRad(3);
  const puff = Math.max(m.cushionRadius * 4.8 * T.puff, 0.152);
  const coreY = legH + totalH * 0.34;

  const sage = shapeMat(THREE, "fabric_accent_sage");
  sage.color.set("#9BB89A");
  const mustard = shapeMat(THREE, "fabric_accent_mustard");
  mustard.color.set("#D4B86A");

  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = roundedBox(THREE, RoundedBoxGeometry, 0.014, legH, 0.014, wood, 0.004);
    leg.position.set(lx * (W / 2 - 0.32), legH / 2, lz * (D / 2 - 0.24));
    root.add(leg);
  }

  const core = roundedBox(THREE, RoundedBoxGeometry, W, totalH * 0.66, D * 0.94, fabric, puff);
  core.position.set(0, coreY, D * 0.01);
  root.add(core);

  const back = roundedBox(THREE, RoundedBoxGeometry, innerW * 0.98, totalH * 0.48, 0.28, fabric, puff * 1.14);
  back.position.set(0, legH + totalH * 0.52, -D * 0.32);
  back.rotation.x = -backTilt;
  root.add(back);

  const belly = roundedBox(THREE, RoundedBoxGeometry, innerW * 0.94, totalH * 0.3, D * 0.44, fabric, puff * 1.18);
  belly.position.set(0, legH + totalH * 0.42, D * 0.22);
  root.add(belly);

  const crown = roundedBox(THREE, RoundedBoxGeometry, innerW * 0.9, totalH * 0.16, 0.22, fabric, puff * 1.22);
  crown.position.set(0, legH + totalH * 0.66, -D * 0.27);
  crown.rotation.x = -backTilt * 0.55;
  root.add(crown);

  const pillowDefs = [
    { mat: sage, x: -innerW * 0.08, z: D * 0.14, sx: 0.13, sy: 0.095, sz: 0.11, ry: 0.2 },
    { mat: mustard, x: innerW * 0.05, z: D * 0.18, sx: 0.11, sy: 0.088, sz: 0.1, ry: -0.14 },
  ];
  for (const p of pillowDefs) {
    const pillow = roundedBox(THREE, RoundedBoxGeometry, p.sx, p.sy, p.sz, p.mat, puff * 0.36);
    pillow.position.set(p.x, legH + totalH * 0.5 + p.sy * 0.12, p.z);
    pillow.rotation.y = p.ry;
    pillow.rotation.x = -0.06;
    root.add(pillow);
  }

  root.scale.set(1.02, 0.86, 1.02);
  return root;
}

function buildV5(THREE, RoundedBoxGeometry, analysis, fabric, wood) {
  const m = analysis.meters;
  const root = new THREE.Group();
  const W = m.overallWidth;
  const D = m.overallDepth;
  const seatCount = analysis.counts.seatCushions;
  const backCount = analysis.counts.backCushions;

  const legH = 0.038;
  const legR = 0.011;
  const armW = m.armWidth * 1.14;
  const gap = m.cushionGap * 1.35;
  const innerW = W - armW * 2;
  const seatW = (innerW - gap * (seatCount - 1)) / seatCount;
  const backW = (innerW - gap * (backCount - 1)) / backCount;
  const seatH = 0.24;
  const seatD = D * 0.52;
  const backH = 0.36;
  const backD = 0.15;
  const backTilt = THREE.MathUtils.degToRad(11);
  const puff = Math.max(m.cushionRadius * 2.1, 0.078);
  const armPuff = Math.max(m.armRadius * 1.35, 0.095);
  const seatTop = legH + seatH;
  const armH = seatTop + backH * 0.42;

  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.82, legH, 12), wood);
    leg.position.set(lx * (W / 2 - 0.22), legH / 2, lz * (D / 2 - 0.14));
    root.add(leg);
  }

  for (let i = 0; i < seatCount; i++) {
    const cx = -innerW / 2 + seatW / 2 + i * (seatW + gap);
    const seat = roundedBox(THREE, RoundedBoxGeometry, seatW * 0.93, seatH, seatD, fabric, puff);
    seat.position.set(cx, legH + seatH / 2, D * 0.06);
    root.add(seat);
    const frontRoll = roundedBox(THREE, RoundedBoxGeometry, seatW * 0.88, seatH * 0.35, seatD * 0.22, fabric, puff * 1.1);
    frontRoll.position.set(cx, legH + seatH * 0.72, D * 0.06 + seatD * 0.42);
    root.add(frontRoll);
  }

  for (let i = 0; i < backCount; i++) {
    const cx = -innerW / 2 + backW / 2 + i * (backW + gap);
    const back = roundedBox(THREE, RoundedBoxGeometry, backW * 0.9, backH, backD, fabric, puff * 1.15);
    back.position.set(cx, seatTop + backH / 2 - 0.02, -D / 2 + backD / 2 + 0.04);
    back.rotation.x = -backTilt;
    root.add(back);
  }

  for (const sx of [-1, 1]) {
    const arm = roundedBox(THREE, RoundedBoxGeometry, armW, armH, D * 0.88, fabric, armPuff);
    arm.position.set(sx * (W / 2 - armW / 2), legH + armH / 2 - 0.015, 0.02);
    root.add(arm);
    const armCap = roundedBox(THREE, RoundedBoxGeometry, armW * 0.92, armH * 0.22, D * 0.82, fabric, armPuff * 1.2);
    armCap.position.set(sx * (W / 2 - armW / 2), legH + armH - armH * 0.08, 0.025);
    root.add(armCap);
  }

  return root;
}

function buildLegacy(THREE, RoundedBoxGeometry, analysis, fabric, wood) {
  return buildV5(THREE, RoundedBoxGeometry, analysis, fabric, wood);
}

function pickBuilder(version) {
  if (version >= 6) return buildV6;
  if (version >= 5) return buildV5;
  return buildLegacy;
}

export async function buildSofaFromAnalysis(analysis, version = 6) {
  const { THREE, GLTFExporter, RoundedBoxGeometry } = await loadThree();
  const fabric = shapeMat(THREE, "fabric_shape");
  const wood = shapeMat(THREE, "wood_shape");

  const root = pickBuilder(version)(THREE, RoundedBoxGeometry, analysis, fabric, wood);
  root.name = `sofa-v${version}`;

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());

  return {
    root,
    GLTFExporter,
    measured: {
      meshWidth: size.x,
      meshHeight: size.y,
      meshDepth: size.z,
      cushionCount: `${analysis.counts.seatCushions}+${analysis.counts.backCushions}`,
    },
  };
}
