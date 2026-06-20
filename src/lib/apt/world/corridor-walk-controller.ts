"use client";

import * as THREE from "three";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import type { ChibiAvatarConfig, ChibiPose } from "@/lib/apt/bondee/types";
import { CORRIDOR_LEN } from "./corridor-meshes";
import type { DoorState } from "./world-types";

export type CorridorDoorHandle = {
  pivot: THREE.Group;
  led?: THREE.Mesh;
  state: DoorState;
  isHome: boolean;
};

export class CorridorWalkController {
  readonly root = new THREE.Group();
  readonly avatar: ChibiAvatarMesh;
  avatarX = -CORRIDOR_LEN / 2 + 1.2;
  avatarZ = 0;
  avatarRot = Math.PI / 2;
  private moveX = 0;
  private moveZ = 0;
  private walkPhase = 0;
  private doors: CorridorDoorHandle[] = [];
  private doorAnim: Map<string, { target: number; state: DoorState }> = new Map();
  private knockTimer = 0;

  constructor(avatarConfig: ChibiAvatarConfig, pose: ChibiPose = "stand") {
    this.avatar = new ChibiAvatarMesh();
    this.avatar.rebuild(avatarConfig, pose);
    this.root.add(this.avatar.root);
    this.syncAvatar();
  }

  setDoors(doors: CorridorDoorHandle[]) {
    this.doors = doors;
    for (const d of doors) {
      this.doorAnim.set(String(d.pivot.uuid), {
        target: d.state === "open" ? Math.PI / 2.2 : 0,
        state: d.state,
      });
    }
  }

  setDoorState(index: number, state: DoorState) {
    const d = this.doors[index];
    if (!d) return;
    d.state = state;
    this.doorAnim.set(String(d.pivot.uuid), {
      target: state === "open" ? Math.PI / 2.2 : 0,
      state,
    });
  }

  setMoveInput(x: number, z: number) {
    this.moveX = x;
    this.moveZ = z;
  }

  getNearestHomeDoor(): CorridorDoorHandle | null {
    return this.doors.find((d) => d.isHome) ?? null;
  }

  canEnterHome(): boolean {
    const home = this.getNearestHomeDoor();
    if (!home) return false;
    if (home.state === "locked") return false;
    if (home.state === "closed") return false;
    const dx = this.avatarX - (CORRIDOR_LEN / 2 - 1.1);
    const dz = this.avatarZ - (home.pivot.parent?.position.z ?? 0);
    return Math.hypot(dx, dz) < 0.65;
  }

  knockOrBell() {
    this.knockTimer = 0.6;
  }

  tick(dt: number): boolean {
    let anim = false;
    const speed = 1.35;
    const len = Math.hypot(this.moveX, this.moveZ);
    if (len > 0.08) {
      const nx = this.moveX / len;
      const nz = this.moveZ / len;
      this.avatarX = THREE.MathUtils.clamp(this.avatarX + nx * speed * dt, -CORRIDOR_LEN / 2 + 0.5, CORRIDOR_LEN / 2 - 0.6);
      this.avatarZ = THREE.MathUtils.clamp(this.avatarZ + nz * speed * dt, -0.75, 0.75);
      this.avatarRot = Math.atan2(nx, nz);
      this.walkPhase += dt;
      this.avatar.animateWalk(this.walkPhase, true);
      anim = true;
    } else {
      this.avatar.animateWalk(this.walkPhase, false);
    }

    for (const d of this.doors) {
      const animState = this.doorAnim.get(String(d.pivot.uuid));
      if (!animState) continue;
      const prev = d.pivot.rotation.y;
      d.pivot.rotation.y = THREE.MathUtils.lerp(prev, animState.target, 0.1);
      if (Math.abs(d.pivot.rotation.y - animState.target) > 0.01) anim = true;
      if (d.led && d.led.material instanceof THREE.MeshBasicMaterial) {
        d.led.material.color.setHex(
          animState.state === "open" ? 0x4ade80 : animState.state === "locked" ? 0xef4444 : 0x94a3b8
        );
      }
    }

    if (this.knockTimer > 0) {
      this.knockTimer -= dt;
      this.avatar.root.rotation.z = Math.sin(this.knockTimer * 28) * 0.04;
      anim = true;
    } else {
      this.avatar.root.rotation.z = 0;
    }

    this.syncAvatar();
    return anim;
  }

  private syncAvatar() {
    this.avatar.root.position.set(this.avatarX, 0.02, this.avatarZ);
    this.avatar.root.rotation.y = this.avatarRot;
  }

  dispose() {
    this.avatar.dispose();
  }
}
