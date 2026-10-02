"use client";

import * as THREE from "three";
import { ChibiAvatarMesh } from "./chibi-avatar";
import type { ChibiAvatarConfig, ChibiPose } from "./types";
import { DEFAULT_CHIBI_AVATAR } from "./types";

export type RemoteHomePlayer = {
  userId: string;
  username: string;
  x: number;
  z: number;
  pose?: string;
  activity?: string;
};

function avatarFromUsername(name: string): ChibiAvatarConfig {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hues = ["#7a8a9a", "#9a7a8a", "#7a9a8a", "#8a9a7a", "#9a8a7a"];
  return {
    ...DEFAULT_CHIBI_AVATAR,
    hairColor: hues[Math.abs(hash) % hues.length],
    topColor: hues[(Math.abs(hash) + 2) % hues.length],
    hairStyle: (Math.abs(hash) % 6) as ChibiAvatarConfig["hairStyle"],
  };
}

function poseFromActivity(activity?: string): ChibiPose {
  switch (activity) {
    case "sit":
      return "sit";
    case "lie":
      return "lie";
    case "wave":
      return "wave";
    case "run":
      return "run";
    default:
      return "stand";
  }
}

/** APT 내 집 — 방문자·이웃 치비 아바타 */
export class RemoteChibiPlayersLayer {
  private root = new THREE.Group();
  private avatars = new Map<string, { mesh: ChibiAvatarMesh; phase: number; lastPose: ChibiPose }>();

  constructor(parent: THREE.Group) {
    parent.add(this.root);
  }

  sync(players: RemoteHomePlayer[]) {
    const ids = new Set(players.map((p) => p.userId));
    for (const id of this.avatars.keys()) {
      if (!ids.has(id)) {
        const entry = this.avatars.get(id)!;
        this.root.remove(entry.mesh.root);
        this.avatars.delete(id);
      }
    }

    for (const p of players) {
      let entry = this.avatars.get(p.userId);
      if (!entry) {
        const mesh = new ChibiAvatarMesh();
        const config = avatarFromUsername(p.username);
        mesh.rebuild(config, poseFromActivity(p.activity));
        mesh.root.scale.setScalar(0.92);
        this.avatars.set(p.userId, { mesh, phase: 0, lastPose: poseFromActivity(p.activity) });
        this.root.add(mesh.root);
        entry = this.avatars.get(p.userId)!;

        const label = this.createNameLabel(p.username);
        label.position.y = 1.55;
        label.name = "name-label";
        entry.mesh.root.add(label);
      }

      const pose = poseFromActivity(p.activity ?? p.pose);
      const config = avatarFromUsername(p.username);
      if (entry.lastPose !== pose) {
        entry.mesh.rebuild(config, pose);
        entry.lastPose = pose;
      }
      entry.mesh.root.position.set(p.x, 0.02, p.z);

      const moving = p.activity === "walk";
      entry.phase += 0.08;
      entry.mesh.animateWalk(entry.phase, moving);
    }
  }

  private createNameLabel(username: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(8, 8, 240, 48, 12);
      ctx.fill();
    } else {
      ctx.fillRect(8, 8, 240, 48);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(username.slice(0, 10), 128, 40);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }

  dispose() {
    for (const { mesh } of this.avatars.values()) {
      this.root.remove(mesh.root);
    }
    this.avatars.clear();
    this.root.clear();
  }
}
