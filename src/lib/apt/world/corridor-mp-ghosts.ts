"use client";

import * as THREE from "three";
import type { FloorOccupant } from "@/actions/apt";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import { DEFAULT_CHIBI_AVATAR } from "@/lib/apt/bondee/types";

/** 같은 층 다른 유저 — 복도에서 마주침 (간이 멀티플레이) */
export function buildCorridorGhosts(occupants: FloorOccupant[], excludeUserId?: string): THREE.Group {
  const g = new THREE.Group();
  g.name = "corridor-ghosts";
  let i = 0;
  for (const o of occupants) {
    if (excludeUserId && o.userId === excludeUserId) continue;
    const avatar = new ChibiAvatarMesh();
    avatar.rebuild(DEFAULT_CHIBI_AVATAR, "stand");
    avatar.root.position.set(-2 + (i % 3) * 1.4, 0.02, -0.4 + Math.floor(i / 3) * 0.6);
    avatar.root.rotation.y = Math.PI * 0.35 * (i % 2 === 0 ? 1 : -1);
    g.add(avatar.root);
    avatar.root.userData.displayName = o.displayName;
    i++;
    if (i >= 4) break;
  }
  return g;
}

export function disposeCorridorGhosts(g: THREE.Group) {
  g.traverse((obj) => {
    if (obj.userData.isChibiRoot) {
      /* ChibiAvatarMesh manages its own dispose via parent */
    }
  });
  while (g.children.length) g.remove(g.children[0]);
}
