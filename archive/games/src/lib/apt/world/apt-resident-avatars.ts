"use client";

import * as THREE from "three";
import type { AptPresenceOccupant } from "@/lib/apt/presence-types";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import { makeCanvasLabel } from "./apt-world-art";

type SpawnedAvatar = {
  root: THREE.Group;
  mesh: ChibiAvatarMesh;
  label: THREE.Mesh;
};

const DISTRICT_SLOTS: [number, number][] = [
  [-1.4, 5.2],
  [1.6, 5.5],
  [-2.8, 4.0],
  [2.5, 4.2],
  [0, 6.2],
  [-0.8, 3.5],
  [1.2, 3.8],
  [3.0, 5.8],
];

const LOBBY_SLOTS: [number, number][] = [
  [-2.5, -1.5],
  [2.8, -1.2],
  [-1.0, 2.0],
  [1.5, 2.2],
  [3.5, 0.5],
  [-3.2, 0.8],
];

const PLAZA_STAGE_SLOTS: [number, number][] = [
  [-0.6, 0],
  [0.6, 0],
  [-1.2, 0.4],
  [1.2, 0.4],
];

/** 로비·광장·단지 — 실제 입주자 치비 아바타 */
export class AptResidentAvatars {
  private group = new THREE.Group();
  private spawned = new Map<string, SpawnedAvatar>();

  constructor() {
    this.group.name = "apt-resident-avatars";
  }

  get root() {
    return this.group;
  }

  sync(
    occupants: AptPresenceOccupant[],
    zone: "district" | "lobby" | "plaza",
    excludeUserId?: string | null
  ) {
    let pool = occupants.filter((o) => o.isOnline && o.userId !== excludeUserId);

    if (zone === "lobby") {
      pool = pool.filter((o) => o.aptMode === "lobby");
    } else if (zone === "plaza") {
      pool = pool.filter((o) => o.activity.streaming || o.activity.musicPlaying);
    } else {
      pool = pool.filter((o) => o.aptMode === "district" || o.aptMode === "lobby" || o.aptMode === "tower");
    }

    const slots =
      zone === "lobby" ? LOBBY_SLOTS : zone === "plaza" ? PLAZA_STAGE_SLOTS : DISTRICT_SLOTS;
    const max = zone === "plaza" ? 4 : 6;
    pool = pool.slice(0, max);

    const keep = new Set(pool.map((o) => o.userId));
    for (const [id, spawned] of this.spawned) {
      if (!keep.has(id)) {
        spawned.mesh.dispose();
        spawned.label.geometry.dispose();
        (spawned.label.material as THREE.Material).dispose();
        this.group.remove(spawned.root);
        this.spawned.delete(id);
      }
    }

    pool.forEach((o, i) => {
      const [x, z] = slots[i % slots.length];
      let entry = this.spawned.get(o.userId);
      if (!entry) {
        const mesh = new ChibiAvatarMesh();
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(0.35, 0.08),
          new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
        );
        label.position.y = 1.35;
        label.renderOrder = 10;
        const root = new THREE.Group();
        root.add(mesh.root);
        root.add(label);
        root.userData.userId = o.userId;
        root.userData.displayName = o.displayName;
        this.group.add(root);
        entry = { root, mesh, label };
        this.spawned.set(o.userId, entry);
      }

      entry.mesh.rebuild(o.avatar, "stand");
      entry.root.position.set(x, zone === "plaza" ? 0.14 : 0.02, z);
      entry.root.rotation.y = zone === "plaza" ? Math.PI : Math.PI * 0.25 * (i % 2 === 0 ? 1 : -1);

      const tag =
        o.activity.streaming ? "LIVE" : o.activity.musicPlaying ? "♪" : o.displayName.slice(0, 6);
      const bg = o.activity.streaming ? 0xec4899 : o.activity.musicPlaying ? 0x8b5cf6 : 0x334455;
      const tex = makeCanvasLabel(tag, { bg, fg: "#ffffff", w: 96, h: 28 });
      const mat = entry.label.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }

  tick(phase: number): boolean {
    let anim = false;
    for (const { mesh, root } of this.spawned.values()) {
      mesh.animateWalk(phase, false);
      root.position.y = 0.02 + Math.sin(phase * 2 + root.position.x) * 0.006;
      anim = true;
    }
    return anim;
  }

  clear() {
    for (const spawned of this.spawned.values()) {
      spawned.mesh.dispose();
      spawned.label.geometry.dispose();
      (spawned.label.material as THREE.Material).dispose();
    }
    this.spawned.clear();
    while (this.group.children.length) this.group.remove(this.group.children[0]);
  }

  dispose() {
    this.clear();
  }
}
