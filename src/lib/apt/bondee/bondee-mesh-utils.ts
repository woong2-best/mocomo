"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Bondee / Animal Crossing inspired pastel palette */
export const BONDEE_PALETTE = {
  bg: 0xfef6f8,
  wood: 0xf5e6d3,
  woodDark: 0xe8d4bc,
  woodGrain: 0xdfc9a8,
  tile: 0xf8f8f8,
  tileLine: 0xe8e8e8,
  carpet: 0xffe0ec,
  carpetAlt: 0xe8e0ff,
  bathroom: 0xd8eeff,
  balcony: 0xe8f4e8,
  wallWhite: 0xffffff,
  wallPink: 0xffe8f0,
  wallMint: 0xd4f0e8,
  wallLavender: 0xe8e0ff,
  wallPeach: 0xffecd9,
  trim: 0xffc8dc,
  accent: 0xffb4c8,
  shadow: 0xc8b8a8,
} as const;

export function bondeeMat(
  color: number | string,
  opts?: Partial<THREE.MeshStandardMaterialParameters>
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.01,
    ...opts,
  });
}

export function bondeeGlowMat(color: number, intensity = 0.35) {
  const m = bondeeMat(color, { emissive: new THREE.Color(color), emissiveIntensity: intensity });
  return m;
}

export function roundedBox(w: number, h: number, d: number, radius = 0.04, segments = 4) {
  return new RoundedBoxGeometry(w, h, d, segments, radius);
}

export function addTo(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0
) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

export function enableBondeeRenderer(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function setupBondeeLights(scene: THREE.Scene, target: THREE.Object3D) {
  scene.background = new THREE.Color(BONDEE_PALETTE.bg);
  scene.fog = new THREE.Fog(BONDEE_PALETTE.bg, 14, 28);

  const hemi = new THREE.HemisphereLight(0xfff8f0, 0xe8d8f0, 0.55);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5eb, 0.72);
  sun.position.set(6, 12, 8);
  sun.castShadow = false;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xd8eeff, 0.28);
  fill.position.set(-5, 6, -4);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffd8c8, 0.35, 6);
  warm.position.set(0, 1.2, 0);
  target.add(warm);

  return { sun, warm };
}

/** Wood plank floor pattern */
export function buildWoodFloor(w: number, d: number, baseColor: number = BONDEE_PALETTE.wood): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    roundedBox(w - 0.02, 0.06, d - 0.02, 0.02),
    bondeeMat(baseColor)
  );
  base.position.y = 0.03;
  base.receiveShadow = true;
  g.add(base);

  const plankW = 0.14;
  const count = Math.max(2, Math.floor(d / plankW));
  for (let i = 0; i < count; i++) {
    const alt = i % 2 === 0;
    const plank = new THREE.Mesh(
      roundedBox(w - 0.06, 0.012, plankW - 0.008, 0.004),
      bondeeMat(alt ? BONDEE_PALETTE.woodDark : BONDEE_PALETTE.woodGrain, {
        transparent: true,
        opacity: 0.35,
      })
    );
    plank.position.set(0, 0.065, -d / 2 + plankW / 2 + i * plankW);
    plank.receiveShadow = true;
    g.add(plank);
  }
  return g;
}

/** Checkered tile floor */
export function buildTileFloor(w: number, d: number): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(roundedBox(w - 0.02, 0.06, d - 0.02, 0.02), bondeeMat(BONDEE_PALETTE.tile));
  base.position.y = 0.03;
  base.receiveShadow = true;
  g.add(base);

  const cell = 0.12;
  const cols = Math.floor(w / cell);
  const rows = Math.floor(d / cell);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 !== 0) continue;
      const tile = new THREE.Mesh(
        roundedBox(cell - 0.01, 0.008, cell - 0.01, 0.003),
        bondeeMat(BONDEE_PALETTE.tileLine, { transparent: true, opacity: 0.4 })
      );
      tile.position.set(-w / 2 + cell / 2 + c * cell, 0.066, -d / 2 + cell / 2 + r * cell);
      tile.receiveShadow = true;
      g.add(tile);
    }
  }
  return g;
}

/** Soft carpet with fringe hint */
export function buildCarpetFloor(w: number, d: number, color: number = BONDEE_PALETTE.carpet): THREE.Group {
  const g = new THREE.Group();
  const rug = new THREE.Mesh(roundedBox(w - 0.04, 0.05, d - 0.04, 0.025), bondeeMat(color));
  rug.position.y = 0.028;
  rug.receiveShadow = true;
  g.add(rug);
  const inner = new THREE.Mesh(
    roundedBox(w * 0.7, 0.008, d * 0.7, 0.02),
    bondeeMat(BONDEE_PALETTE.carpetAlt, { transparent: true, opacity: 0.45 })
  );
  inner.position.y = 0.058;
  g.add(inner);
  return g;
}

/** Low semi-transparent Bondee wall */
export function buildLowWall(wx: number, h: number, wz: number, exterior: boolean): THREE.Group {
  const g = new THREE.Group();
  const opacity = exterior ? 0.42 : 0.22;
  const wall = new THREE.Mesh(
    roundedBox(wx, h, wz, 0.015),
    bondeeMat(BONDEE_PALETTE.wallWhite, { transparent: true, opacity })
  );
  wall.position.y = h / 2 + 0.05;
  wall.castShadow = !exterior;
  wall.receiveShadow = true;
  g.add(wall);

  const trim = new THREE.Mesh(
    roundedBox(wx + 0.01, 0.025, wz + 0.01, 0.008),
    bondeeMat(BONDEE_PALETTE.trim, { transparent: true, opacity: 0.65 })
  );
  trim.position.y = 0.06;
  g.add(trim);

  return g;
}

/** Cute round window for exterior walls */
export function buildRoundWindow(radius = 0.08): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.018, 8, 20),
    bondeeMat(BONDEE_PALETTE.trim)
  );
  frame.rotation.x = Math.PI / 2;
  frame.position.y = 0.22;
  g.add(frame);

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 0.02, 16),
    bondeeMat(0xb8e8ff, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1 })
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0.22;
  g.add(glass);

  const sill = new THREE.Mesh(roundedBox(radius * 2.2, 0.025, 0.04, 0.008), bondeeMat(BONDEE_PALETTE.wallWhite));
  sill.position.set(0, 0.12, 0.03);
  g.add(sill);

  return g;
}

/** Room name plate on floor edge */
export function buildRoomLabel(text: string, accent: number): THREE.Group {
  const g = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(24, 12);
  ctx.lineTo(232, 12);
  ctx.quadraticCurveTo(248, 12, 248, 28);
  ctx.lineTo(248, 44);
  ctx.quadraticCurveTo(248, 56, 232, 56);
  ctx.lineTo(24, 56);
  ctx.quadraticCurveTo(8, 56, 8, 44);
  ctx.lineTo(8, 28);
  ctx.quadraticCurveTo(8, 12, 24, 12);
  ctx.fill();
  const hex = `#${accent.toString(16).padStart(6, "0")}`;
  ctx.fillStyle = hex.length > 7 ? "#ffb4c8" : hex;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 36);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    roundedBox(0.42, 0.02, 0.12, 0.008),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.07;
  g.add(plate);
  return g;
}

export function shadowizeGroup(g: THREE.Object3D, enabled = false) {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = enabled;
      o.receiveShadow = enabled;
    }
  });
}
