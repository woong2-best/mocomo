"use client";

import * as THREE from "three";
import type { AptPresenceOccupant } from "@/lib/apt/presence-types";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import { makeCanvasLabel } from "./apt-world-art";

/** 같은 층 온라인 입주자 — 실제 아바타·이름 */
export function buildCorridorGhosts(
  occupants: AptPresenceOccupant[],
  excludeUserId?: string
): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-ghosts";

  const online = occupants.filter(
    (o) =>
      o.isOnline &&
      o.userId !== excludeUserId &&
      (o.aptMode === "corridor" || o.aptMode === "interior" || !!o.visitingUserId)
  );

  let i = 0;
  for (const o of online) {
    const avatar = new ChibiAvatarMesh();
    avatar.rebuild(o.avatar, "stand");
    avatar.root.position.set(-2 + (i % 3) * 1.4, 0.02, -0.4 + Math.floor(i / 3) * 0.6);
    avatar.root.rotation.y = Math.PI * 0.35 * (i % 2 === 0 ? 1 : -1);
    avatar.root.userData.displayName = o.displayName;
    avatar.root.userData.userId = o.userId;
    g.add(avatar.root);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.07),
      new THREE.MeshBasicMaterial({
        map: makeCanvasLabel(o.displayName.slice(0, 8), {
          bg: 0x4488cc,
          fg: "#ffffff",
          w: 96,
          h: 24,
        }),
        transparent: true,
        depthWrite: false,
      })
    );
    label.position.set(avatar.root.position.x, 1.28, avatar.root.position.z);
    label.renderOrder = 5;
    g.add(label);

    i++;
    if (i >= 4) break;
  }
  return g;
}

export function disposeCorridorGhosts(g: THREE.Group) {
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
    }
  });
  while (g.children.length) g.remove(g.children[0]);
}
