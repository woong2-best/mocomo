import * as THREE from "three";
import type { BuildPiece } from "@/lib/apt/house/build-types";
import { GRID_UNIT } from "@/lib/apt/house/build-types";

const WALL_H = 2.8;
const WALL_T = 0.18;

const palette: Record<BuildPiece["kind"], number> = {
  foundation: 0x8a7a68,
  wall: 0xe8e0d4,
  floor: 0xc4a882,
  roof: 0x8b3a2a,
  door: 0x5c3d2e,
  window: 0x88c8e8,
  fence: 0x6b5344,
  tree: 0x2d6a2d,
  lamp: 0x444444,
  garage: 0x9aa0a8,
};

export function gridToWorld(gx: number, gz: number, gy: number, plotHalf: number) {
  return {
    x: gx * GRID_UNIT,
    y: gy * GRID_UNIT + (gy === 0 ? 0.02 : 0),
    z: gz * GRID_UNIT,
  };
}

export function createPieceMesh(piece: BuildPiece, plotHalf: number): THREE.Object3D {
  const g = new THREE.Group();
  g.userData.pieceId = piece.id;
  const { x, y, z } = gridToWorld(piece.gx, piece.gz, piece.gy, plotHalf);
  g.position.set(x, y, z);
  g.rotation.y = (piece.rot * Math.PI) / 2;

  const mat = (color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, ...opts });

  switch (piece.kind) {
    case "foundation": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.98, 0.25, GRID_UNIT * 0.98), mat(palette.foundation));
      m.position.y = 0.12;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      break;
    }
    case "wall": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.96, WALL_H, WALL_T), mat(palette.wall));
      m.position.y = WALL_H / 2 + 0.25;
      m.castShadow = true;
      g.add(m);
      break;
    }
    case "floor": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.96, 0.08, GRID_UNIT * 0.96), mat(palette.floor));
      m.position.y = 0.28;
      m.receiveShadow = true;
      g.add(m);
      break;
    }
    case "roof": {
      const shape = new THREE.Shape();
      shape.moveTo(-GRID_UNIT * 0.5, 0);
      shape.lineTo(0, GRID_UNIT * 0.42);
      shape.lineTo(GRID_UNIT * 0.5, 0);
      shape.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: GRID_UNIT * 0.92, bevelEnabled: false }), mat(palette.roof));
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 3.05, -GRID_UNIT * 0.46);
      m.castShadow = true;
      g.add(m);
      break;
    }
    case "door": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.5, 2.1, WALL_T), mat(palette.door));
      frame.position.y = 1.3;
      g.add(frame);
      break;
    }
    case "window": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.55, 0.9, WALL_T * 0.8), mat(0x3a3a3a));
      frame.position.y = 1.8;
      g.add(frame);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(GRID_UNIT * 0.42, 0.72, 0.04),
        mat(palette.window, { transparent: true, opacity: 0.75, metalness: 0.2 })
      );
      glass.position.set(0, 1.8, WALL_T * 0.35);
      g.add(glass);
      break;
    }
    case "fence": {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), mat(palette.fence));
      post.position.y = 0.65;
      g.add(post);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT, 0.06, 0.06), mat(palette.fence));
      rail.position.y = 0.9;
      g.add(rail);
      break;
    }
    case "tree": {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 8), mat(0x5c3d2e));
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      g.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 10), mat(palette.tree));
      crown.position.y = 1.85;
      crown.castShadow = true;
      g.add(crown);
      break;
    }
    case "lamp": {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), mat(palette.lamp));
      pole.position.y = 1.6;
      g.add(pole);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        mat(0xfff4c8, { emissive: 0xffaa44, emissiveIntensity: 0.6 })
      );
      bulb.position.y = 3.2;
      g.add(bulb);
      const light = new THREE.PointLight(0xffcc88, 0.8, 12);
      light.position.y = 3.2;
      g.add(light);
      break;
    }
    case "garage": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 2, 2.4, GRID_UNIT * 1.8), mat(palette.garage));
      body.position.set(0, 1.45, 0);
      body.castShadow = true;
      g.add(body);
      const door = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 1.6, 2, 0.08), mat(0x6a7078));
      door.position.set(0, 1.25, GRID_UNIT * 0.92);
      g.add(door);
      break;
    }
  }

  return g;
}

export function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
