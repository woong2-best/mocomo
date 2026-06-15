import * as THREE from "three";
import type { ParkingLevel, ParkingSpot } from "./parking-rush-logic";
import type { ParkingMapTheme } from "./parking-rush-theme";

/** US-style big-box + outdoor mega lot props */
export function buildUsMegaLotEnvironment(
  group: THREE.Group,
  level: ParkingLevel,
  theme: ParkingMapTheme,
  localSpotId?: string
) {
  const { w, h } = level.bounds;
  addBigBoxStore(group, w);
  addPerimeterTrees(group, w, h);
  addCobraLightPoles(group, w, h, theme);
  addCartCorrals(group, w, h);
  addStopSigns(group, level);
  addSpotMarkings(group, level.parkingSpots, localSpotId, theme);
  addDrivingLaneArrows(group, w, h);
}

function addBigBoxStore(group: THREE.Group, lotW: number) {
  const storeW = lotW * 0.55;
  const storeH = 14;
  const storeD = 8;
  const cx = lotW / 2;

  const facade = new THREE.Mesh(
    new THREE.BoxGeometry(storeW, storeH, storeD),
    new THREE.MeshStandardMaterial({ color: "#c4b5a0", roughness: 0.85, metalness: 0.05 })
  );
  facade.position.set(cx, storeH / 2, -storeD / 2 + 1);
  facade.castShadow = true;
  facade.receiveShadow = true;
  group.add(facade);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(storeW * 1.05, 0.4, 3),
    new THREE.MeshStandardMaterial({ color: "#1e3a5f", roughness: 0.6 })
  );
  awning.position.set(cx, 3.2, 4);
  group.add(awning);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(storeW * 0.7, 2.5, 0.3),
    new THREE.MeshStandardMaterial({ color: "#1d4ed8", emissive: "#1e40af", emissiveIntensity: 0.25 })
  );
  sign.position.set(cx, storeH - 1.5, 0.5);
  group.add(sign);

  const entrance = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 0.2),
    new THREE.MeshStandardMaterial({ color: "#38bdf8", transparent: true, opacity: 0.65 })
  );
  entrance.position.set(cx, 2, 0.2);
  group.add(entrance);
}

function addPerimeterTrees(group: THREE.Group, w: number, h: number) {
  const palmMat = new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.8 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.9 });
  const pts: [number, number][] = [
    [6, h - 8],
    [w - 6, h - 8],
    [4, h * 0.55],
    [w - 4, h * 0.55],
    [8, 12],
    [w - 8, 12],
  ];
  for (const [x, z] of pts) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6), trunkMat);
    trunk.position.set(x, 1.1, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), palmMat);
    leaves.scale.set(1, 1.6, 1);
    leaves.position.set(x, 3, z);
    group.add(leaves);
  }
}

function addCobraLightPoles(group: THREE.Group, w: number, h: number, theme: ParkingMapTheme) {
  const poleMat = new THREE.MeshStandardMaterial({ color: "#52525b", metalness: 0.7, roughness: 0.35 });
  const spacing = 14;
  for (let x = spacing; x < w; x += spacing) {
    for (const z of [h * 0.35, h * 0.72]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 7, 8), poleMat);
      pole.position.set(x, 3.5, z);
      group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), poleMat);
      arm.position.set(x + 1, 6.8, z);
      group.add(arm);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.25, 0.5),
        new THREE.MeshStandardMaterial({ color: "#fef9c3", emissive: theme.lampColor, emissiveIntensity: 0.6 })
      );
      head.position.set(x + 2, 6.6, z);
      group.add(head);
      const light = new THREE.PointLight(theme.lampColor, theme.lampIntensity * 0.85, 22, 1.4);
      light.position.set(x + 2, 6.2, z);
      group.add(light);
    }
  }
}

function addCartCorrals(group: THREE.Group, w: number, h: number) {
  const railMat = new THREE.MeshStandardMaterial({ color: "#71717a", metalness: 0.75, roughness: 0.35 });
  for (const x of [w * 0.22, w * 0.78]) {
    const corral = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 2.8), railMat);
      rail.position.set(i * 0.55, 0.45, 0);
      corral.add(rail);
    }
    corral.position.set(x, 0, h - 10);
    group.add(corral);
  }
}

function addStopSigns(group: THREE.Group, level: ParkingLevel) {
  const postMat = new THREE.MeshStandardMaterial({ color: "#71717a", metalness: 0.6 });
  const signMat = new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 });
  const w = level.bounds.w;
  const h = level.bounds.h;
  for (const x of [w * 0.32, w * 0.68]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2, 6), postMat);
    post.position.set(x, 1, h - 10);
    group.add(post);
    const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 12), signMat);
    sign.rotation.x = Math.PI / 2;
    sign.position.set(x, 2.1, h - 10);
    group.add(sign);
  }
}

function addSpotMarkings(
  group: THREE.Group,
  spots: ParkingSpot[],
  localSpotId: string | undefined,
  theme: ParkingMapTheme
) {
  const yellow = new THREE.Color(theme.neon);
  const white = new THREE.Color("#f8fafc");
  const handicap = new THREE.Color("#2563eb");

  for (const spot of spots) {
    const isTarget = spot.id === localSpotId;
    const lineColor = isTarget ? yellow : white;
    const lineMat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: isTarget ? 1 : 0.85,
    });

    const hw = spot.w / 2;
    const hh = spot.h / 2;
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
      [-hw, -hh],
    ].map(([lx, ly]) => {
      const cos = Math.cos(spot.angle);
      const sin = Math.sin(spot.angle);
      return new THREE.Vector3(
        spot.x + lx * cos - ly * sin,
        0.06,
        spot.y + lx * sin + ly * cos
      );
    });

    const geo = new THREE.BufferGeometry().setFromPoints(corners);
    group.add(new THREE.Line(geo, lineMat));

    if (isTarget) {
      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(spot.w * 0.92, spot.h * 0.92),
        new THREE.MeshStandardMaterial({
          color: yellow,
          transparent: true,
          opacity: 0.12,
          emissive: yellow,
          emissiveIntensity: 0.35,
          side: THREE.DoubleSide,
        })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.rotation.z = spot.angle;
      fill.position.set(spot.x, 0.04, spot.y);
      group.add(fill);
    }

    if (spot.id.endsWith("0") || spot.id.endsWith("4")) {
      const ada = new THREE.Mesh(
        new THREE.PlaneGeometry(spot.w * 0.35, spot.h * 0.25),
        new THREE.MeshStandardMaterial({ color: handicap, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ada.rotation.x = -Math.PI / 2;
      ada.rotation.z = spot.angle;
      ada.position.set(spot.x - spot.w * 0.25, 0.05, spot.y - spot.h * 0.3);
      group.add(ada);
    }
  }
}

function addDrivingLaneArrows(group: THREE.Group, w: number, h: number) {
  const arrowMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", transparent: true, opacity: 0.35 });
  for (let z = 18; z < h - 12; z += 16) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 3), arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(w / 2, 0.05, z);
    group.add(arrow);
  }
}

export function addUsSky(group: THREE.Group, level: ParkingLevel, theme: ParkingMapTheme) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(0.55, theme.skyBottom);
  grad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 512);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 6; i++) {
    const y = 40 + i * 70 + Math.random() * 20;
    ctx.beginPath();
    ctx.ellipse(4, y, 2.5, 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(level.bounds.w + 40, 45),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  sky.position.set(level.bounds.w / 2, 22, -6);
  group.add(sky);

  const mountains = new THREE.Mesh(
    new THREE.PlaneGeometry(level.bounds.w + 50, 12),
    new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 1 })
  );
  mountains.position.set(level.bounds.w / 2, 6, -10);
  group.add(mountains);
}
