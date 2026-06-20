"use client";

import * as THREE from "three";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import { ElevatorDoorAnimator } from "@/lib/apt/bondee/elevator-door";
import type { ChibiAvatarConfig, ChibiPose } from "@/lib/apt/bondee/types";

export class LobbyWalkController {
  readonly root = new THREE.Group();
  readonly avatar: ChibiAvatarMesh;
  avatarX = 0;
  avatarZ = 2;
  avatarRot = Math.PI;
  private moveX = 0;
  private moveZ = 0;
  private walkPhase = 0;
  private bounds = { minX: -6.5, maxX: 6.5, minZ: -4.5, maxZ: 4.5 };
  private elevDoors = new ElevatorDoorAnimator();
  private nearStairs = false;
  private nearElevator = false;
  private nearMailbox = false;

  constructor(avatarConfig: ChibiAvatarConfig, pose: ChibiPose = "stand") {
    this.avatar = new ChibiAvatarMesh();
    this.avatar.rebuild(avatarConfig, pose);
    this.root.add(this.avatar.root);
    this.syncAvatar();
  }

  setBounds(b: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    this.bounds = b;
  }

  bindElevatorHall(hall: THREE.Object3D | null) {
    this.elevDoors.bindHall(hall);
    this.elevDoors.setTarget(0);
  }

  setMoveInput(x: number, z: number) {
    this.moveX = x;
    this.moveZ = z;
  }

  getNearStairs() {
    return this.nearStairs;
  }

  getNearElevator() {
    return this.nearElevator;
  }

  getNearMailbox() {
    return this.nearMailbox;
  }

  tick(dt: number): boolean {
    let anim = this.elevDoors.tick(dt);

    const speed = 1.25;
    const len = Math.hypot(this.moveX, this.moveZ);
    if (len > 0.08) {
      const nx = this.moveX / len;
      const nz = this.moveZ / len;
      this.avatarX = THREE.MathUtils.clamp(this.avatarX + nx * speed * dt, this.bounds.minX, this.bounds.maxX);
      this.avatarZ = THREE.MathUtils.clamp(this.avatarZ + nz * speed * dt, this.bounds.minZ, this.bounds.maxZ);
      this.avatarRot = Math.atan2(nx, nz);
      this.walkPhase += dt;
      this.avatar.animateWalk(this.walkPhase, true);
      anim = true;
    } else {
      this.avatar.animateWalk(this.walkPhase, false);
    }

    this.nearStairs = Math.hypot(this.avatarX + 6, this.avatarZ - 2) < 1.1;
    this.nearElevator = Math.hypot(this.avatarX, this.avatarZ - 3.5) < 1.0;
    this.nearMailbox = Math.hypot(this.avatarX - 2, this.avatarZ + 4.5) < 1.2;

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
