"use client";

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { BONDEE_COLORS, hexToThree } from "@/lib/apt/style/bondee-color-bible";
import { bondeeMaterialParams } from "@/lib/apt/style/bondee-material-bible";
import { BONDEE_LIGHTING } from "@/lib/apt/style/bondee-lighting-bible";

/** @deprecated use BONDEE_COLORS — 하위 호환 */
export const BONDEE_PALETTE = {
  bg: hexToThree(BONDEE_COLORS.fogCream),
  wood: hexToThree(BONDEE_COLORS.warmBeige),
  woodDark: hexToThree(BONDEE_COLORS.lightOak),
  woodGrain: hexToThree(BONDEE_COLORS.lightOak),
  tile: hexToThree("#EDF2F7"),
  tileLine: hexToThree("#D8E4EC"),
  carpet: hexToThree(BONDEE_COLORS.softPink),
  carpetAlt: hexToThree(BONDEE_COLORS.mutedBlue),
  bathroom: hexToThree("#D8EEFF"),
  balcony: hexToThree("#E8F4E8"),
  wallWhite: hexToThree(BONDEE_COLORS.cream),
  wallPink: hexToThree(BONDEE_COLORS.softPink),
  wallMint: hexToThree(BONDEE_COLORS.pastelGreen),
  wallLavender: hexToThree("#E8E0F0"),
  wallPeach: hexToThree(BONDEE_COLORS.floorBounce),
  trim: hexToThree(BONDEE_COLORS.rimOrange),
  accent: hexToThree(BONDEE_COLORS.warmWood),
  shadow: hexToThree(BONDEE_COLORS.shadowSoft),
} as const;

export function bondeeMat(
  color: number | string,
  opts?: Partial<THREE.MeshStandardMaterialParameters>
) {
  return new THREE.MeshStandardMaterial(bondeeMaterialParams(color, "plastic", opts));
}

export function bondeeGlowMat(color: number, intensity = 0.35) {
  const m = bondeeMat(color, { emissive: new THREE.Color(color), emissiveIntensity: intensity });
  return m;
}

export function roundedBox(w: number, h: number, d: number, radius = 0.055, segments = 4) {
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BONDEE_LIGHTING.renderer.toneMappingExposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function setupBondeeLights(scene: THREE.Scene, target: THREE.Object3D) {
  const L = BONDEE_LIGHTING;
  scene.background = new THREE.Color(hexToThree(BONDEE_COLORS.fogCream));
  scene.fog = new THREE.Fog(hexToThree(BONDEE_COLORS.fogCream), L.fog.near, L.fog.far);

  scene.add(new THREE.AmbientLight(L.ambient.color, L.ambient.intensity));
  scene.add(new THREE.HemisphereLight(L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity));

  const sun = new THREE.DirectionalLight(L.sun.color, L.sun.intensity);
  sun.position.set(...L.sun.position);
  sun.castShadow = false;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
  fill.position.set(...L.fill.position);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(L.rim.color, L.rim.intensity);
  rim.position.set(...L.rim.position);
  scene.add(rim);

  const warm = new THREE.PointLight(hexToThree(BONDEE_COLORS.floorBounce), 0.12, 6);
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

/** Low semi-transparent Bondee wall — legacy; prefer buildExteriorWall / buildInteriorWall */
export function buildLowWall(wx: number, h: number, wz: number, exterior: boolean): THREE.Group {
  return exterior ? buildExteriorWall(wx, h, wz) : buildInteriorWall(wx, h, wz);
}

export const WALL_EXTERIOR_COLOR = 0xf5f5f5;
export const WALL_INTERIOR_COLOR = 0xf5f5f5;
export const WALL_EXTERIOR_OPACITY = 1.0;
export const WALL_INTERIOR_OPACITY = 0.35;
export const WALL_OCCLUDE_INTERIOR = 0.35;
export const WALL_OCCLUDE_EXTERIOR = 0.22;

export type HomeWallKind = "exterior" | "interior";
export type HomeWallTypeTag = "EXTERIOR" | "INTERIOR";

export function homeWallKindToTag(kind: HomeWallKind): HomeWallTypeTag {
  return kind === "exterior" ? "EXTERIOR" : "INTERIOR";
}

export function homeWallTagToKind(tag: HomeWallTypeTag): HomeWallKind {
  return tag === "EXTERIOR" ? "exterior" : "interior";
}

export function tagHomeWall(mesh: THREE.Mesh, kind: HomeWallKind, wallId?: string, wallSide?: string) {
  const tag = homeWallKindToTag(kind);
  const baseOpacity = kind === "exterior" ? WALL_EXTERIOR_OPACITY : WALL_INTERIOR_OPACITY;
  mesh.userData.isHomeWall = true;
  mesh.userData.wallKind = kind;
  mesh.userData.wallType = tag;
  mesh.userData.wallId = wallId;
  mesh.userData.wallSide = wallSide;
  mesh.userData.baseOpacity = baseOpacity;
  mesh.userData.occludeOpacity = kind === "exterior" ? WALL_OCCLUDE_EXTERIOR : WALL_OCCLUDE_INTERIOR;
  mesh.userData.occlusionEnabled = kind === "exterior";
  mesh.renderOrder = kind === "exterior" ? 1 : 2;
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mat.transparent = kind !== "exterior" || baseOpacity < 1;
  mat.opacity = baseOpacity;
  mat.depthWrite = kind === "exterior";
}

/** Solid exterior shell — thick opaque box (dollhouse toy-house feel) */
export function buildExteriorWall(
  wx: number,
  h: number,
  wz: number,
  wallId?: string,
  wallSide?: string
): THREE.Group {
  const g = new THREE.Group();
  g.userData.wallGroupKind = "exterior";
  g.userData.wallType = "EXTERIOR";
  g.userData.wallSide = wallSide;

  const wall = new THREE.Mesh(
    roundedBox(wx, h, wz, 0.03),
    bondeeMat(WALL_EXTERIOR_COLOR, { transparent: false, opacity: WALL_EXTERIOR_OPACITY, roughness: 0.84 })
  );
  wall.position.y = h / 2 + 0.05;
  tagHomeWall(wall, "exterior", wallId, wallSide);
  g.add(wall);

  const top = new THREE.Mesh(
    roundedBox(wx + 0.006, 0.02, wz + 0.006, 0.006),
    bondeeMat(0xffffff, { transparent: true, opacity: 0.98, roughness: 0.7 })
  );
  top.position.y = h + 0.058;
  tagHomeWall(top, "exterior", wallId, wallSide);
  g.add(top);

  const shadow = new THREE.Mesh(
    roundedBox(wx + 0.024, 0.01, wz + 0.05, 0.004),
    bondeeMat(0x000000, { transparent: true, opacity: 0.14, depthWrite: false })
  );
  shadow.position.y = 0.064;
  shadow.renderOrder = 0;
  g.add(shadow);

  const trim = new THREE.Mesh(
    roundedBox(wx + 0.014, 0.034, wz + 0.014, 0.008),
    bondeeMat(BONDEE_PALETTE.trim, { transparent: true, opacity: 0.8 })
  );
  trim.position.y = 0.068;
  trim.renderOrder = 1;
  g.add(trim);

  return g;
}

/** Interior partition — thin semi-transparent divider between rooms */
export function buildInteriorWall(
  wx: number,
  h: number,
  wz: number,
  wallId?: string,
  wallSide?: string
): THREE.Group {
  const g = new THREE.Group();
  g.userData.wallGroupKind = "interior";
  g.userData.wallType = "INTERIOR";
  g.userData.wallSide = wallSide;

  const wall = new THREE.Mesh(
    roundedBox(wx, h, wz, 0.018),
    bondeeMat(WALL_INTERIOR_COLOR, {
      transparent: true,
      opacity: WALL_INTERIOR_OPACITY,
      depthWrite: false,
      roughness: 0.8,
    })
  );
  wall.position.y = h / 2 + 0.05;
  tagHomeWall(wall, "interior", wallId, wallSide);
  g.add(wall);

  const top = new THREE.Mesh(
    roundedBox(wx + 0.003, 0.01, wz + 0.003, 0.003),
    bondeeMat(0xffffff, { transparent: true, opacity: 0.22, depthWrite: false })
  );
  top.position.y = h + 0.052;
  tagHomeWall(top, "interior", wallId, wallSide);
  g.add(top);

  return g;
}

export function setObjectRenderLayer(root: THREE.Object3D, order: number) {
  root.renderOrder = order;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.renderOrder = order;
  });
}

/** Cute round window for exterior walls */
export function buildRoundWindow(radius = 0.1): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.022, 8, 20),
    bondeeMat(BONDEE_PALETTE.trim)
  );
  frame.rotation.x = Math.PI / 2;
  frame.position.y = 0;
  g.add(frame);

  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(radius - 0.02, 16),
    bondeeMat(0xb8e8ff, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1 })
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = 0;
  g.add(glass);

  const sill = new THREE.Mesh(roundedBox(radius * 2.2, 0.03, 0.05, 0.01), bondeeMat(BONDEE_PALETTE.wallWhite));
  sill.position.set(0, -radius * 0.55, 0.03);
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
