"use client";

import * as THREE from "three";
import type { BondeeFurnitureKind, BondeePlacedItem } from "./types";

const GRID = 0.55;

function mat(color: number | string, rough = 0.6) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}

export function gridToWorld(gx: number, gz: number) {
  return { x: gx * GRID, z: gz * GRID };
}

export function buildFurnitureMesh(kind: BondeeFurnitureKind): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = kind;

  switch (kind) {
    case "bookshelf": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.28), mat(0x8b6914));
      frame.position.y = 0.55;
      g.add(frame);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.12),
            mat([0xc45, 0x4a7, 0x94a, 0xa55, 0x5a8, 0x88c][(row + col) % 6])
          );
          book.position.set(-0.28 + col * 0.28, 0.2 + row * 0.24, 0.02);
          g.add(book);
        }
      }
      break;
    }
    case "sofa": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.45), mat(0x8b5a3c));
      base.position.y = 0.18;
      g.add(base);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.12), mat(0x7a4a32));
      back.position.set(0, 0.38, -0.18);
      g.add(back);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.35), mat(0xc9956a));
      cushion.position.set(0, 0.32, 0.02);
      g.add(cushion);
      break;
    }
    case "tv_stand": {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.25), mat(0xf0f0f0));
      stand.position.y = 0.2;
      g.add(stand);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.04), mat(0x1a1a1a, 0.2));
      screen.position.set(0, 0.55, 0.02);
      g.add(screen);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.02), mat(0x88bbee, 0.1));
      glow.position.set(0, 0.54, 0.06);
      (glow.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x4488cc);
      (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
      g.add(glow);
      break;
    }
    case "coffee_table": {
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.3), mat(0x2a2a2a));
      top.position.y = 0.22;
      g.add(top);
      for (const [x, z] of [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.1], [0.15, 0.1]] as const) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), mat(0x2a2a2a));
        leg.position.set(x, 0.1, z);
        g.add(leg);
      }
      break;
    }
    case "floor_lamp": {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.9), mat(0x333333, 0.3));
      pole.position.y = 0.45;
      g.add(pole);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 16, 1, true), mat(0xf5e6c8, 0.8));
      shade.position.y = 0.88;
      g.add(shade);
      break;
    }
    case "plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.14), mat(0xc47a5a));
      pot.position.y = 0.07;
      g.add(pot);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mat(0x4a8a4a));
      leaves.position.y = 0.28;
      leaves.scale.set(1, 1.2, 1);
      g.add(leaves);
      break;
    }
    case "treadmill": {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.9), mat(0x3a3a3a));
      belt.position.y = 0.12;
      g.add(belt);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), mat(0x888888, 0.3));
      rail.position.set(0, 0.4, -0.35);
      g.add(rail);
      break;
    }
    case "desk": {
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.35), mat(0xf5f0ea));
      top.position.y = 0.38;
      g.add(top);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.3), mat(0xffffff));
      leg.position.y = 0.18;
      g.add(leg);
      const laptop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.15), mat(0xaaaaaa, 0.2));
      laptop.position.set(0, 0.42, 0);
      laptop.rotation.x = -0.3;
      g.add(laptop);
      break;
    }
    case "bed": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.9), mat(0xd4c4b0));
      frame.position.y = 0.12;
      g.add(frame);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.18), mat(0xf8f8f8));
      pillow.position.set(0, 0.26, -0.28);
      g.add(pillow);
      break;
    }
    case "ac": {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.12), mat(0xf5f5f5));
      unit.position.y = 0.6;
      g.add(unit);
      break;
    }
    case "clock": {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), mat(0xffffff));
      face.rotation.x = Math.PI / 2;
      face.position.y = 0.5;
      g.add(face);
      break;
    }
    case "rug": {
      const rug = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.6), mat(0x6a5a4a, 0.9));
      rug.position.y = 0.01;
      g.add(rug);
      break;
    }
    case "washer": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), mat(0xf0f0f0));
      body.position.y = 0.22;
      g.add(body);
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), mat(0xcccccc, 0.2));
      door.rotation.x = Math.PI / 2;
      door.position.set(0, 0.22, 0.18);
      g.add(door);
      break;
    }
    case "hoop": {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 8, 20), mat(0xff4400, 0.3));
      rim.position.y = 0.7;
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.3), mat(0x444444));
      back.position.set(0, 0.45, -0.1);
      g.add(back);
      break;
    }
    case "shelf_small": {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), mat(0xdeb887));
      shelf.position.y = 0.25;
      g.add(shelf);
      break;
    }
  }

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function syncRoomFurniture(root: THREE.Group, items: BondeePlacedItem[]) {
  const ids = new Set(items.map((i) => i.id));
  for (let i = root.children.length - 1; i >= 0; i--) {
    const c = root.children[i];
    if (!ids.has(c.userData.placedId as string)) {
      root.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
  }

  for (const item of items) {
    let node = root.children.find((c) => c.userData.placedId === item.id) as THREE.Group | undefined;
    if (!node) {
      node = buildFurnitureMesh(item.kind);
      node.userData.placedId = item.id;
      root.add(node);
    }
    const { x, z } = gridToWorld(item.gx, item.gz);
    node.position.set(x, 0, z);
    node.rotation.y = (item.rot * Math.PI) / 2;
  }
}
