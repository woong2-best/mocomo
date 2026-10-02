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
  stairs: 0x9a8a78,
  pillar: 0xb8b0a4,
  pool: 0x3d9ee8,
  sofa: 0x6a5a8a,
  bed: 0x4a6a9a,
  table: 0x7a5a3a,
  chimney: 0x8a4a3a,
  balcony: 0xc8c0b4,
  mailbox: 0x3a5a8a,
  driveway: 0x5a5a5a,
};

export function gridToWorld(gx: number, gz: number, gy: number) {
  return {
    x: gx * GRID_UNIT,
    y: gy * GRID_UNIT + (gy === 0 ? 0.02 : 0),
    z: gz * GRID_UNIT,
  };
}

function mat(color: number, opts?: Partial<THREE.MeshStandardMaterialParameters>) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, ...opts });
}

export function createPieceMesh(piece: BuildPiece, _plotHalf: number): THREE.Object3D {
  const g = new THREE.Group();
  g.userData.pieceId = piece.id;
  g.userData.pieceKind = piece.kind;
  const { x, y, z } = gridToWorld(piece.gx, piece.gz, piece.gy);
  g.position.set(x, y, z);
  g.rotation.y = (piece.rot * Math.PI) / 2;

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
      g.userData.isDoor = true;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.5, 2.1, WALL_T), mat(palette.door));
      frame.position.y = 1.3;
      g.add(frame);
      break;
    }
    case "window": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.55, 0.9, WALL_T * 0.8), mat(0x3a3a3a));
      frame.position.y = 1.8;
      g.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.42, 0.72, 0.04), mat(palette.window, { transparent: true, opacity: 0.75 }));
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
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mat(0xfff4c8, { emissive: 0xffaa44, emissiveIntensity: 0.6 }));
      bulb.position.y = 3.2;
      g.add(bulb);
      g.add(new THREE.PointLight(0xffcc88, 0.8, 12).translateY(3.2));
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
    case "stairs": {
      for (let i = 0; i < 4; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 0.9, 0.12, 0.28), mat(palette.stairs));
        step.position.set(0, 0.2 + i * 0.12, -0.35 + i * 0.22);
        step.castShadow = true;
        g.add(step);
      }
      break;
    }
    case "pillar": {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 2.6, 8), mat(palette.pillar));
      m.position.y = 1.55;
      m.castShadow = true;
      g.add(m);
      break;
    }
    case "pool": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT * 2, 0.35, GRID_UNIT * 1.2), mat(palette.pool, { transparent: true, opacity: 0.85, metalness: 0.3 }));
      m.position.y = 0.1;
      g.add(m);
      break;
    }
    case "sofa": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.65), mat(palette.sofa));
      base.position.y = 0.35;
      g.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.15), mat(palette.sofa));
      back.position.set(0, 0.7, -0.28);
      g.add(back);
      break;
    }
    case "bed": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2), mat(palette.bed));
      base.position.y = 0.3;
      g.add(base);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), mat(0xf0f0f0));
      pillow.position.set(0, 0.55, -0.75);
      g.add(pillow);
      break;
    }
    case "table": {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.7), mat(palette.table));
      top.position.y = 0.75;
      g.add(top);
      for (const [tx, tz] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), mat(palette.table));
        leg.position.set(tx, 0.38, tz);
        g.add(leg);
      }
      break;
    }
    case "chimney": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), mat(palette.chimney));
      m.position.y = 1.2;
      m.castShadow = true;
      g.add(m);
      break;
    }
    case "balcony": {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT, 0.1, 0.8), mat(palette.balcony));
      floor.position.set(0, 1.2, 0.35);
      g.add(floor);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT, 0.5, 0.05), mat(0x888888));
      rail.position.set(0, 1.5, 0.72);
      g.add(rail);
      break;
    }
    case "mailbox": {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1, 6), mat(0x666666));
      post.position.y = 0.5;
      g.add(post);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.18), mat(palette.mailbox));
      box.position.y = 1.05;
      g.add(box);
      break;
    }
    case "driveway": {
      const m = new THREE.Mesh(new THREE.BoxGeometry(GRID_UNIT, 0.06, GRID_UNIT * 1.5), mat(palette.driveway));
      m.position.y = 0.05;
      m.receiveShadow = true;
      g.add(m);
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
