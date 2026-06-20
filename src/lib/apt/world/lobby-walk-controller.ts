"use client";

import * as THREE from "three";
import { AptWorldAvatar } from "./apt-world-avatar";
import { ElevatorDoorAnimator } from "@/lib/apt/bondee/elevator-door";
import type { ChibiAvatarConfig } from "@/lib/apt/bondee/types";

export class LobbyWalkController {
  readonly root = new THREE.Group();
  readonly avatar: AptWorldAvatar;
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
  private climbingStairs = false;

  constructor(avatarConfig: ChibiAvatarConfig, vrmUrl?: string | null) {
    this.avatar = new AptWorldAvatar();
    void this.avatar.init(avatarConfig, vrmUrl);
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

  getNearElevator() {
    return this.nearElevator;
  }

  getNearStairs() {
    return this.nearStairs;
  }

  getNearMailbox() {
    return this.nearMailbox;
  }

  setElevatorAction(riding: boolean) {
    this.avatar.setAction(riding ? "elevator_ride" : "elevator_idle");
  }

  setClimbingStairs(climbing: boolean) {
    this.climbingStairs = climbing;
    if (climbing) {
      this.moveX = 0;
      this.moveZ = 0;
      this.avatar.setAction("elevator_ride");
    }
  }

  setAvatarPose(x: number, y: number, z: number, rot: number) {
    this.avatarX = x;
    this.avatarZ = z;
    this.avatarRot = rot;
    this.avatar.root.position.set(x, y, z);
    this.avatar.root.rotation.y = rot;
  }

  tick(dt: number): boolean {
    let anim = this.elevDoors.tick(dt);

    if (this.climbingStairs) {
      anim = this.avatar.tick(dt, false) || anim;
      return anim;
    }

    const speed = 1.25;
    const len = Math.hypot(this.moveX, this.moveZ);
    const moving = len > 0.08;
    if (moving) {
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
