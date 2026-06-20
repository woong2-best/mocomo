"use client";

import * as THREE from "three";
import { AptWorldAvatar } from "./apt-world-avatar";
import { ElevatorDoorAnimator } from "@/lib/apt/bondee/elevator-door";
import type { ChibiAvatarConfig } from "@/lib/apt/bondee/types";
import { CORRIDOR_LEN } from "./corridor-meshes";
import type { DoorState } from "./world-types";

export type CorridorDoorHandle = {
  pivot: THREE.Group;
  led?: THREE.Mesh;
  bell?: THREE.Mesh;
  knocker?: THREE.Mesh;
  unitIndex: number;
  state: DoorState;
  isHome: boolean;
};

export class CorridorWalkController {
  readonly root = new THREE.Group();
  readonly avatar: AptWorldAvatar;
  avatarX = -CORRIDOR_LEN / 2 + 1.2;
  avatarZ = 0;
  avatarRot = Math.PI / 2;
  private moveX = 0;
  private moveZ = 0;
  private walkPhase = 0;
  private doors: CorridorDoorHandle[] = [];
  private doorAnim: Map<string, { target: number; state: DoorState }> = new Map();
  private knockTimer = 0;
  private elevDoors = new ElevatorDoorAnimator();

  constructor(avatarConfig: ChibiAvatarConfig, vrmUrl?: string | null) {
    this.avatar = new AptWorldAvatar();
    void this.avatar.init(avatarConfig, vrmUrl);
    this.root.add(this.avatar.root);
    this.syncAvatar();
  }

  bindElevatorHall(hall: THREE.Object3D | null) {
    this.elevDoors.bindHall(hall);
    this.elevDoors.setTarget(0);
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
    const d = this.doors.find((door) => door.unitIndex === index);
    if (!d) return;
    d.state = state;
    this.doorAnim.set(String(d.pivot.uuid), {
      target: state === "open" ? Math.PI / 2.2 : 0,
      state,
    });
    if (state === "open") {
      this.avatar.setAction("door_open");
      window.setTimeout(() => this.avatar.setAction("stand"), 900);
    }
  }

  setMoveInput(x: number, z: number) {
    this.moveX = x;
    this.moveZ = z;
  }

  getNearestHomeDoor(): CorridorDoorHandle | null {
    return this.doors.find((d) => d.isHome) ?? null;
  }

  getNearElevator(): boolean {
    return Math.hypot(this.avatarX - (-CORRIDOR_LEN / 2 + 0.85), this.avatarZ) < 1.05;
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

  knockOrBell(kind: "knock" | "bell" = "knock") {
    this.knockTimer = 0.75;
    this.avatar.setAction(kind);
    const home = this.getNearestHomeDoor();
    if (kind === "knock" && home?.knocker) {
      home.knocker.rotation.z = 0.25;
    }
    if (kind === "bell" && home?.bell && home.bell.material instanceof THREE.MeshStandardMaterial) {
      home.bell.material.emissive = new THREE.Color(0xffd700);
      home.bell.material.emissiveIntensity = 0.8;
    }
  }

  tick(dt: number): boolean {
    let anim = false;
    anim = this.elevDoors.tick(dt) || anim;

    const speed = 1.35;
    const len = Math.hypot(this.moveX, this.moveZ);
    const moving = len > 0.08;

    if (moving && this.knockTimer <= 0) {
      const nx = this.moveX / len;
      const nz = this.moveZ / len;
      this.avatarX = THREE.MathUtils.clamp(this.avatarX + nx * speed * dt, -CORRIDOR_LEN / 2 + 0.5, CORRIDOR_LEN / 2 - 0.6);
      this.avatarZ = THREE.MathUtils.clamp(this.avatarZ + nz * speed * dt, -0.75, 0.75);
      this.avatarRot = Math.atan2(nx, nz);
      this.walkPhase += dt;
      this.avatar.animateWalk(this.walkPhase, true);
      anim = true;
    } else if (this.knockTimer <= 0) {
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
      const glow = d.pivot.getObjectByName("door-inner-glow");
      if (glow instanceof THREE.Mesh && glow.material instanceof THREE.MeshBasicMaterial) {
        const targetOp = animState.state === "open" ? 0.38 : 0;
        glow.material.opacity = THREE.MathUtils.lerp(glow.material.opacity, targetOp, 0.12);
        if (Math.abs(glow.material.opacity - targetOp) > 0.01) anim = true;
      }
      if (d.knocker) {
        d.knocker.rotation.z = THREE.MathUtils.lerp(d.knocker.rotation.z, 0, 0.15);
      }
      if (d.bell?.material instanceof THREE.MeshStandardMaterial) {
        d.bell.material.emissiveIntensity = THREE.MathUtils.lerp(d.bell.material.emissiveIntensity, 0, 0.12);
      }
    }

    if (this.knockTimer > 0) {
      this.knockTimer -= dt;
      anim = true;
      if (this.knockTimer <= 0) this.avatar.setAction("stand");
    }

    anim = this.avatar.tick(dt, moving) || anim;
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
