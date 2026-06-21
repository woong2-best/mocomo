"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { ChibiAvatarMesh } from "@/lib/apt/bondee/chibi-avatar";
import type { ChibiAvatarConfig, ChibiPose } from "@/lib/apt/bondee/types";
import { DEFAULT_AVATAR_VRM_URL } from "@/lib/virtual-avatar/avatar-3d-scene";
import { loadActiveVrm } from "@/lib/virtual-avatar/vrm-storage";
import { AptWorldVrmAnimator } from "./apt-world-vrm-animator";
import type { WorldAvatarAction, WorldAvatarMode } from "./world-avatar-types";

const VRM_SCALE = 0.95;
const AVATAR_SCALE = 1.28;
const VRM_Y_OFFSET = -0.02;

/** VRM 우선 + 고품질 치비 폴백 — 복도·로비·엘리베이터 공용 */
export class AptWorldAvatar {
  readonly root = new THREE.Group();
  private chibi: ChibiAvatarMesh | null = null;
  private chibiConfig: ChibiAvatarConfig | null = null;
  private vrm: VRM | null = null;
  private vrmWrap = new THREE.Group();
  private vrmAnimator = new AptWorldVrmAnimator();
  private shadow: THREE.Mesh | null = null;
  private mode: WorldAvatarMode = "chibi";
  private action: WorldAvatarAction = "stand";
  private actionTime = 0;
  private loading = false;
  private disposed = false;

  constructor() {
    this.root.name = "apt-world-avatar";
    this.root.scale.setScalar(AVATAR_SCALE);
    this.root.add(this.vrmWrap);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.root.add(this.shadow);
  }

  getMode() {
    return this.mode;
  }

  getAction() {
    return this.action;
  }

  async init(config: ChibiAvatarConfig, vrmUrl?: string | null) {
    this.chibiConfig = config;
    this.ensureChibi(config, "stand");
    await this.tryLoadVrm(vrmUrl);
  }

  rebuild(config: ChibiAvatarConfig, pose: ChibiPose = "stand") {
    this.chibiConfig = config;
    if (this.mode === "vrm") return;
    this.ensureChibi(config, pose);
  }

  setAction(action: WorldAvatarAction) {
    if (this.action === action) return;
    this.action = action;
    this.actionTime = 0;
    this.vrmAnimator.setAction(action);
  }

  animateWalk(phase: number, moving: boolean) {
    if (moving) {
      if (this.action !== "knock" && this.action !== "bell" && this.action !== "door_open") {
        this.setAction("walk");
      }
      if (this.mode === "chibi" && this.chibi) {
        this.chibi.animateWalk(phase, true);
      }
      return;
    }
    if (this.action === "walk") this.setAction("stand");
    if (this.mode === "chibi" && this.chibi) {
      this.chibi.animateWalk(phase, false);
    }
  }

  tick(dt: number, moving = false) {
    this.actionTime += dt;
    if (this.mode === "vrm" && this.vrm) {
      this.vrmWrap.position.y =
        VRM_Y_OFFSET + (this.action === "elevator_ride" ? Math.sin(this.actionTime * 9) * 0.015 : 0);
      this.vrmAnimator.tick(this.vrm, dt, moving);
      this.vrm.update(dt);
      return true;
    }
    if (this.mode === "chibi" && this.chibi) {
      this.tickChibiAction();
      return true;
    }
    return false;
  }

  dispose() {
    this.disposed = true;
    this.chibi?.dispose();
    this.chibi = null;
    if (this.vrm) {
      this.vrm.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      this.vrmWrap.clear();
      this.vrm = null;
    }
    this.shadow?.geometry.dispose();
    (this.shadow?.material as THREE.Material)?.dispose();
  }

  private ensureChibi(config: ChibiAvatarConfig, pose: ChibiPose) {
    if (!this.chibi) {
      this.chibi = new ChibiAvatarMesh();
      this.root.add(this.chibi.root);
    }
    this.chibi.rebuild(config, pose);
    this.chibi.root.visible = this.mode === "chibi";
  }

  private async tryLoadVrm(explicitUrl?: string | null) {
    if (this.loading || this.disposed) return;
    this.loading = true;
    try {
      let url = explicitUrl ?? null;
      if (!url) {
        const custom = await loadActiveVrm();
        if (custom) url = URL.createObjectURL(custom.blob);
      }
      if (!url) url = DEFAULT_AVATAR_VRM_URL;
      const vrm = await this.loadVrmFromUrl(url);
      if (this.disposed || !vrm) return;
      this.vrm = vrm;
      this.mode = "vrm";
      if (this.chibi) this.chibi.root.visible = false;
      this.vrmWrap.clear();
      this.vrmWrap.add(vrm.scene);
      vrm.scene.scale.setScalar(VRM_SCALE);
      vrm.scene.rotation.y = Math.PI;
      this.vrmAnimator.setAction(this.action);
    } catch {
      this.mode = "chibi";
      if (this.chibi) this.chibi.root.visible = true;
    } finally {
      this.loading = false;
    }
  }

  private async loadVrmFromUrl(url: string): Promise<VRM | null> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm: VRM = gltf.userData.vrm;
    if (!vrm) return null;
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse((o) => {
      o.frustumCulled = false;
    });
    return vrm;
  }

  private tickChibiAction() {
    if (!this.chibi) return;
    const body = this.chibi.root.children[0] as THREE.Group | undefined;
    if (!body) return;
    const t = this.actionTime;
    const armR = body.getObjectByName("arm-r");
    const armL = body.getObjectByName("arm-l");
    const legL = body.getObjectByName("leg-l");
    const legR = body.getObjectByName("leg-r");

    body.rotation.z = 0;
    body.rotation.x = 0;
    if (this.action === "knock") {
      const p = Math.sin(t * 14) * 0.5 + 0.5;
      if (armR) armR.rotation.set(0.9 * p, 0, -0.5);
      if (armL) armL.rotation.set(0.2, 0, 0.3);
      body.rotation.x = 0.06 * p;
    } else if (this.action === "bell") {
      const p = Math.sin(t * 10) * 0.5 + 0.5;
      if (armR) armR.rotation.set(-1.3, 0, -0.3 - p * 0.3);
      if (armL) armL.rotation.set(0.15, 0, 0.25);
    } else if (this.action === "door_open") {
      const p = Math.min(1, t * 2.2);
      if (armR) armR.rotation.set(0.4, 0, -0.8 * p);
      if (armL) armL.rotation.set(0.3, 0, 0.5 * p);
    } else if (this.action === "elevator_idle") {
      body.position.y = Math.sin(t * 1.2) * 0.008;
      if (armR) armR.rotation.set(0.15, 0, -0.25);
      if (armL) armL.rotation.set(0.15, 0, 0.25);
    } else if (this.action === "elevator_ride") {
      body.position.y = Math.sin(t * 9) * 0.018;
      body.rotation.z = Math.sin(t * 3.5) * 0.035;
      if (armR) armR.rotation.set(0.1, 0, -0.2);
      if (armL) armL.rotation.set(0.1, 0, 0.2);
      if (legL) legL.rotation.x = Math.sin(t * 9) * 0.05;
      if (legR) legR.rotation.x = -Math.sin(t * 9) * 0.05;
    } else {
      body.position.y = 0;
    }
  }
}

export async function resolveAptWorldVrmUrl(): Promise<string> {
  try {
    const custom = await loadActiveVrm();
    if (custom) return URL.createObjectURL(custom.blob);
  } catch {
    /* ignore */
  }
  return DEFAULT_AVATAR_VRM_URL;
}
