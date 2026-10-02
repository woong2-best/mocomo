import * as THREE from "three";
import type { BuildPiece } from "@/lib/apt/house/build-types";
import { GRID_UNIT } from "@/lib/apt/house/build-types";
import { createPieceMesh, disposeObject3D, gridToWorld } from "@/lib/apt/house/build-meshes";

export type InteriorBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  doorPos: { x: number; z: number } | null;
};

export function computeInteriorBounds(pieces: BuildPiece[]): InteriorBounds {
  const floorKinds = new Set(["floor", "foundation", "sofa", "bed", "table"]);
  const cells = pieces.filter((p) => floorKinds.has(p.kind) || p.kind === "wall" || p.kind === "door");
  if (!cells.length) {
    return { minX: -2, maxX: 2, minZ: -2, maxZ: 2, centerX: 0, centerZ: 0, width: 4, depth: 4, doorPos: { x: 0, z: 2 } };
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of cells) {
    const { x, z } = gridToWorld(p.gx, p.gz, p.gy);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const pad = GRID_UNIT * 0.5;
  minX -= pad;
  maxX += pad;
  minZ -= pad;
  maxZ += pad;

  const door = pieces.find((p) => p.kind === "door");
  const doorPos = door ? gridToWorld(door.gx, door.gz, door.gy) : { x: 0, z: maxZ };

  return {
    minX, maxX, minZ, maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX + GRID_UNIT,
    depth: maxZ - minZ + GRID_UNIT,
    doorPos: { x: doorPos.x, z: doorPos.z },
  };
}

export function buildInteriorScene(pieces: BuildPiece[], groundY: number): THREE.Group {
  const root = new THREE.Group();
  root.name = "interior";
  const bounds = computeInteriorBounds(pieces);
  const { width, depth, centerX, centerZ } = bounds;
  const floorY = groundY + 0.3;

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.1, depth),
    new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.9 })
  );
  floor.position.set(centerX, floorY, centerZ);
  floor.receiveShadow = true;
  root.add(floor);

  const wallH = 2.6;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0ebe3, roughness: 0.88, side: THREE.DoubleSide });
  const walls = [
    [width + 0.2, wallH, 0.15, centerX, floorY + wallH / 2, centerZ - depth / 2 - 0.08],
    [width + 0.2, wallH, 0.15, centerX, floorY + wallH / 2, centerZ + depth / 2 + 0.08],
    [0.15, wallH, depth + 0.2, centerX - width / 2 - 0.08, floorY + wallH / 2, centerZ],
    [0.15, wallH, depth + 0.2, centerX + width / 2 + 0.08, floorY + wallH / 2, centerZ],
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
  }

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.08, depth),
    new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.95 })
  );
  ceiling.position.set(centerX, floorY + wallH, centerZ);
  root.add(ceiling);

  root.add(new THREE.AmbientLight(0xfff8f0, 0.55));
  const ceilLight = new THREE.PointLight(0xfff4e0, 1.2, width + depth);
  ceilLight.position.set(centerX, floorY + wallH - 0.3, centerZ);
  root.add(ceilLight);

  if (bounds.doorPos) {
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.1), doorMat);
    door.position.set(bounds.doorPos.x, floorY + 1, bounds.doorPos.z + 0.1);
    door.userData.isExitDoor = true;
    root.add(door);
  }

  const furnitureKinds = new Set(["sofa", "bed", "table", "window"]);
  for (const p of pieces) {
    if (!furnitureKinds.has(p.kind)) continue;
    const mesh = createPieceMesh(p, 0);
    mesh.position.y += floorY;
    root.add(mesh);
  }

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(width * 0.6, 3), 0.02, Math.min(depth * 0.5, 2)),
    new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.95 })
  );
  rug.position.set(centerX, floorY + 0.06, centerZ);
  root.add(rug);

  root.userData.bounds = bounds;
  root.userData.floorY = floorY;
  return root;
}

export function disposeInterior(group: THREE.Group) {
  disposeObject3D(group);
}
