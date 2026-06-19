"use client";

import * as THREE from "three";
import { AptVrmAgent } from "@/lib/apt/simulation/vrm-agent";
import type { OutdoorActivity } from "@/lib/apt/house/build-types";
import { terrainHeight } from "@/lib/apt/house/procedural-world";

export class OutdoorAvatarController {
  readonly root = new THREE.Group();
  private agent: AptVrmAgent | null = null;
  private x = 0;
  private z = 2;
  private rotY = 0;
  private speed = 0;
  private activity: OutdoorActivity = "idle";
  private wanderTimer = 0;
  private wanderDir = 0;
  private ready = false;

  constructor(private vrmUrl: string, private worldSeed: number, private plotHalf: number) {}

  async load() {
    this.agent = new AptVrmAgent(this.vrmUrl);
    try {
      await this.agent.load();
    } catch {
      this.agent = null;
    }
    if (this.agent) this.root.add(this.agent.root);
    this.ready = true;
    this.syncPosition();
  }

  getActivity() {
    return this.activity;
  }

  getPosition() {
    return { x: this.x, z: this.z, rotY: this.rotY };
  }

  isReady() {
    return this.ready;
  }

  setActivity(a: OutdoorActivity) {
    this.activity = a;
  }

  update(dt: number, keys: Set<string>, modeActive: boolean) {
    if (!this.agent) return;

    let moving = false;
    if (modeActive) {
      const fwd = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
      const str = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      if (fwd || str) {
        this.wanderTimer = 0;
        this.activity = keys.has("shift") ? "wave" : "walk";
        const mag = Math.hypot(fwd, str) || 1;
        const dx = (str / mag) * 3.5 * dt;
        const dz = (fwd / mag) * 3.5 * dt;
        this.x = THREE.MathUtils.clamp(this.x + dx, -this.plotHalf + 0.5, this.plotHalf - 0.5);
        this.z = THREE.MathUtils.clamp(this.z + dz, -this.plotHalf + 0.5, this.plotHalf - 0.5);
        this.rotY = Math.atan2(dx, dz);
        moving = true;
      } else if (keys.has(" ")) {
        this.activity = "sit";
      } else {
        this.wanderTimer += dt;
        if (this.wanderTimer > 3) {
          this.activity = "walk";
          this.wanderDir += (Math.random() - 0.5) * dt * 2;
          this.x += Math.sin(this.wanderDir) * dt * 1.2;
          this.z += Math.cos(this.wanderDir) * dt * 1.2;
          this.x = THREE.MathUtils.clamp(this.x, -this.plotHalf + 0.5, this.plotHalf - 0.5);
          this.z = THREE.MathUtils.clamp(this.z, -this.plotHalf + 0.5, this.plotHalf - 0.5);
          this.rotY = this.wanderDir;
          moving = true;
        } else {
          this.activity = "idle";
        }
      }
    }

    this.syncPosition();
    const y = terrainHeight(this.x, this.z, this.worldSeed);
    this.agent.update(dt, this.x, y, this.z, this.rotY, moving && this.activity !== "sit");
  }

  private syncPosition() {
    const y = terrainHeight(this.x, this.z, this.worldSeed);
    this.root.position.set(this.x, y, this.z);
  }

  dispose() {
    this.agent?.dispose();
    this.agent = null;
    this.root.clear();
  }
}
