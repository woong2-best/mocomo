"use client";

import * as THREE from "three";
import type { ChibiAvatarConfig, ChibiPose } from "./types";

const MAT = (color: string | number, opts?: Partial<THREE.MeshStandardMaterialParameters>) =>
  new THREE.MeshStandardMaterial({
    color: typeof color === "string" ? color : color,
    roughness: 0.52,
    metalness: 0.02,
    envMapIntensity: 0.35,
    ...opts,
  });

function hex(c: string) {
  return new THREE.Color(c);
}

export class ChibiAvatarMesh {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private hairRoot = new THREE.Group();
  private parts: THREE.Object3D[] = [];
  private currentPose: ChibiPose = "stand";
  private legL: THREE.Mesh | null = null;
  private legR: THREE.Mesh | null = null;
  private armL: THREE.Object3D | null = null;
  private armR: THREE.Object3D | null = null;

  constructor() {
    this.root.add(this.body);
    this.body.add(this.hairRoot);
  }

  rebuild(config: ChibiAvatarConfig, pose: ChibiPose) {
    this.clearParts();
    this.buildBody(config);
    this.buildHair(config);
    this.buildFace(config);
    this.currentPose = pose;
    this.applyPose(pose);
  }

  setPose(pose: ChibiPose) {
    if (this.currentPose === pose) return;
    this.currentPose = pose;
    this.applyPose(pose);
  }

  getPose() {
    return this.currentPose;
  }

  /** Walk cycle without full rebuild */
  animateWalk(phase: number, moving: boolean) {
    if (!moving) {
      if (this.currentPose === "stand" || this.currentPose === "wave") {
        this.body.position.y = Math.sin(phase * 2) * 0.004;
      }
      if (this.currentPose === "stand") {
        if (this.legL) this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, 0.15);
        if (this.legR) this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, 0.15);
        if (this.armL) this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0, 0.15);
        if (this.armR) this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, 0, 0.15);
      }
      return;
    }

    const bounce = Math.sin(phase * 10) * 0.022;
    this.body.position.y = bounce;
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0.04, 0.12);

    const swing = Math.sin(phase * 10) * 0.52;
    if (this.legL) this.legL.rotation.x = swing;
    if (this.legR) this.legR.rotation.x = -swing;
    if (this.armL) this.armL.rotation.x = -swing * 0.55;
    if (this.armR) this.armR.rotation.x = swing * 0.55;
  }

  private clearParts() {
    for (const p of this.parts) {
      p.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      p.parent?.remove(p);
    }
    this.parts = [];
    this.legL = null;
    this.legR = null;
    this.armL = null;
    this.armR = null;
    while (this.body.children.length > 1) this.body.remove(this.body.children[this.body.children.length - 1]);
    while (this.hairRoot.children.length) this.hairRoot.remove(this.hairRoot.children[0]);
  }

  private add(mesh: THREE.Object3D, parent: THREE.Object3D = this.body) {
    parent.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  private buildBody(config: ChibiAvatarConfig) {
    const skin = MAT(config.skinColor);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), skin);
    head.position.y = 0.72;
    head.scale.set(1.05, 1, 0.95);
    head.castShadow = true;
    this.add(head);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.22, 6, 10), MAT(config.topColor));
    torso.position.y = 0.38;
    torso.scale.set(1.1, 1, 0.85);
    torso.castShadow = true;
    this.add(torso);

    if (config.topStyle === 1) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.22), MAT(config.topColor, { roughness: 0.4 }));
      lapel.position.set(0, 0.48, 0.02);
      this.add(lapel);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), MAT("#f5f5f5"));
      inner.position.set(0, 0.4, 0.04);
      this.add(inner);
    } else if (config.topStyle === 2) {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT(config.topColor));
      hood.position.set(0, 0.62, -0.08);
      hood.rotation.x = -0.3;
      this.add(hood);
    }

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), MAT(config.bottomColor));
    hips.position.y = 0.2;
    this.add(hips);

    const legGeo = new THREE.CapsuleGeometry(0.07, 0.18, 4, 8);
    const legMat = MAT(config.bottomColor);
    this.legL = new THREE.Mesh(legGeo, legMat);
    this.legL.position.set(-0.09, 0.06, 0);
    this.legL.name = "leg-l";
    this.legR = this.legL.clone();
    this.legR.position.x = 0.09;
    this.legR.name = "leg-r";
    this.add(this.legL);
    this.add(this.legR);

    const shoeMat = MAT(config.shoeColor, { roughness: 0.35 });
    for (const x of [-0.09, 0.09]) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.14), shoeMat);
      shoe.position.set(x, -0.02, 0.03);
      this.add(shoe);
    }

    const armGeo = new THREE.CapsuleGeometry(0.05, 0.16, 4, 6);
    const armMat = MAT(config.topColor);
    this.armL = new THREE.Mesh(armGeo, armMat);
    this.armL.position.set(-0.24, 0.4, 0);
    this.armL.rotation.z = 0.25;
    this.armL.name = "arm-l";
    this.armR = this.armL.clone();
    this.armR.position.x = 0.24;
    this.armR.rotation.z = -0.25;
    this.armR.name = "arm-r";
    this.add(this.armL);
    this.add(this.armR);
  }

  private buildHair(config: ChibiAvatarConfig) {
    const hairMat = MAT(config.hairColor, { roughness: 0.7 });
    const s = config.hairStyle;

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.position.y = 0.78;
    cap.scale.set(1.05, 0.9, 1);
    this.hairRoot.add(cap);
    this.parts.push(cap);

    if (s === 1 || s === 4) {
      const long = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.35, 6, 8), hairMat);
      long.position.set(0, 0.55, -0.12);
      long.rotation.x = 0.2;
      this.hairRoot.add(long);
      this.parts.push(long);
    }
    if (s === 2) {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 6, 8), hairMat);
      tail.position.set(0, 0.62, -0.22);
      tail.rotation.x = -0.5;
      this.hairRoot.add(tail);
      this.parts.push(tail);
    }
    if (s === 3) {
      for (const x of [-0.12, 0.12]) {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 6), hairMat);
        tail.position.set(x, 0.6, -0.15);
        tail.rotation.set(-0.3, x > 0 ? 0.2 : -0.2, 0);
        this.hairRoot.add(tail);
        this.parts.push(tail);
      }
    }
    if (s === 5) {
      for (let i = 0; i < 5; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hairMat);
        const a = (i / 5) * Math.PI * 2;
        puff.position.set(Math.cos(a) * 0.22, 0.78 + Math.sin(i) * 0.04, Math.sin(a) * 0.18);
        this.hairRoot.add(puff);
        this.parts.push(puff);
      }
    }
    if (s === 0) {
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.12), hairMat);
      bang.position.set(0, 0.88, 0.12);
      this.hairRoot.add(bang);
      this.parts.push(bang);
    }
  }

  private buildFace(config: ChibiAvatarConfig) {
    const eyeMat = MAT("#1a1a1a");
    const y = 0.72;
    const z = 0.22;

    if (config.eyeStyle === 0) {
      for (const x of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
        eye.position.set(x, y, z);
        this.add(eye);
      }
    } else if (config.eyeStyle === 1) {
      for (const x of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        eye.scale.set(1, 1.3, 0.5);
        eye.position.set(x, y + 0.01, z);
        this.add(eye);
      }
    } else if (config.eyeStyle === 2) {
      for (const x of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12, Math.PI), eyeMat);
        eye.position.set(x, y, z);
        eye.rotation.z = Math.PI;
        this.add(eye);
      }
    } else {
      const closed = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.02), eyeMat);
      closed.position.set(0, y, z);
      this.add(closed);
    }

    const mouthMat = MAT("#c47a6a");
    const my = y - 0.1;
    if (config.mouthStyle === 0) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), mouthMat);
      m.position.set(0, my, z - 0.01);
      m.rotation.z = Math.PI;
      this.add(m);
    } else if (config.mouthStyle === 1) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), mouthMat);
      m.position.set(0, my, z);
      this.add(m);
    } else if (config.mouthStyle === 2) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mouthMat);
      m.position.set(0, my - 0.01, z);
      m.rotation.x = Math.PI;
      this.add(m);
    }

    if (config.blush) {
      const blushMat = MAT("#ffb0b8", { transparent: true, opacity: 0.45 });
      for (const x of [-0.14, 0.14]) {
        const b = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), blushMat);
        b.position.set(x, y - 0.05, z - 0.02);
        this.add(b);
      }
    }
  }

  private applyPose(pose: ChibiPose) {
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    if (this.legL) this.legL.rotation.set(0, 0, 0);
    if (this.legR) this.legR.rotation.set(0, 0, 0);
    if (this.armL) {
      this.armL.rotation.set(0, 0, 0.25);
      this.armL.position.set(-0.24, 0.4, 0);
    }
    if (this.armR) {
      this.armR.rotation.set(0, 0, -0.25);
      this.armR.position.set(0.24, 0.4, 0);
    }

    if (pose === "stand" || pose === "wave") {
      if (pose === "wave" && this.armR) {
        this.armR.rotation.set(-1.2, 0, -0.8);
      }
    } else if (pose === "sit") {
      this.body.position.set(0, 0.06, 0.06);
      this.body.rotation.x = -0.22;
      if (this.armL) this.armL.rotation.set(0.55, 0, 0.45);
      if (this.armR) this.armR.rotation.set(0.55, 0, -0.45);
      if (this.legL) this.legL.rotation.x = 1.25;
      if (this.legR) this.legR.rotation.x = 1.25;
    } else if (pose === "lie") {
      this.body.position.set(0, 0.2, 0.12);
      this.body.rotation.set(-Math.PI / 2 + 0.15, 0, 0);
      if (this.legL) this.legL.rotation.x = 0.15;
      if (this.legR) this.legR.rotation.x = -0.15;
    } else if (pose === "lie_prone") {
      this.body.position.set(0, 0.1, 0.08);
      this.body.rotation.set(Math.PI / 2 - 0.12, 0, 0);
      if (this.armL) this.armL.rotation.set(0.35, 0, 0.45);
      if (this.armR) this.armR.rotation.set(0.35, 0, -0.45);
    } else if (pose === "run") {
      this.body.position.y = 0.06;
      this.body.rotation.x = 0.18;
      if (this.armL) this.armL.rotation.set(-0.85, 0, 0.35);
      if (this.armR) this.armR.rotation.set(0.65, 0, -0.35);
      if (this.legL) this.legL.rotation.x = 0.55;
      if (this.legR) this.legR.rotation.x = -0.45;
    }
  }

  dispose() {
    this.clearParts();
    this.root.clear();
  }
}

export function chibiPreviewColor(config: ChibiAvatarConfig) {
  return hex(config.hairColor);
}
