import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";
import type { FurnitureItem } from "./types";

function roomLocalPos(room: AptRoom, lx: number, lz: number) {
  const c = roomCenter(room);
  const { w, d } = roomSize(room);
  return { x: c.x + lx * w * 0.35, z: c.z + lz * d * 0.35 };
}

export function buildFurnitureMesh(item: FurnitureItem, room: AptRoom): THREE.Group {
  const g = new THREE.Group();
  g.userData.furnitureId = item.id;
  const p = roomLocalPos(room, item.x, item.z);
  g.position.set(p.x, 0.12, p.z);

  if (item.type === "tv") {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4 })
    );
    stand.position.y = 0.06;
    g.add(stand);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.42, 0.05),
      new THREE.MeshStandardMaterial({
        color: item.active ? 0x88ccff : 0x111822,
        emissive: item.active ? 0x4488cc : 0x000000,
        emissiveIntensity: item.active ? 1.2 : 0,
        roughness: 0.2,
      })
    );
    screen.name = "tv-screen";
    screen.position.y = 0.38;
    g.add(screen);

    if (item.active) {
      const glow = new THREE.PointLight(0x88ccff, 0.35, 2.2);
      glow.position.set(0, 0.4, 0.15);
      g.add(glow);
    }
  }

  if (item.type === "sofa") {
    const sofa = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.32, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xc9956a, roughness: 0.7 })
    );
    sofa.position.y = 0.16;
    g.add(sofa);
  }

  return g;
}

export function syncFurnitureGroup(
  group: THREE.Group,
  items: FurnitureItem[],
  rooms: AptRoom[]
) {
  const existing = new Set<string>();
  for (const item of items) {
    const room = rooms.find((r) => r.id === item.roomId);
    if (!room) continue;
    existing.add(item.id);
    let node = group.children.find((c) => c.userData.furnitureId === item.id) as THREE.Group | undefined;
    if (!node) {
      node = buildFurnitureMesh(item, room);
      group.add(node);
    } else {
      const p = roomLocalPos(room, item.x, item.z);
      node.position.set(p.x, 0.12, p.z);
      const screen = node.getObjectByName("tv-screen") as THREE.Mesh | undefined;
      if (screen && screen.material instanceof THREE.MeshStandardMaterial) {
        screen.material.color.setHex(item.active ? 0x88ccff : 0x111822);
        screen.material.emissive.setHex(item.active ? 0x4488cc : 0x000000);
        screen.material.emissiveIntensity = item.active ? 1.2 : 0;
      }
    }
  }
  for (let i = group.children.length - 1; i >= 0; i--) {
    const c = group.children[i];
    if (!existing.has(c.userData.furnitureId as string)) {
      group.remove(c);
      c.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
  }
}
