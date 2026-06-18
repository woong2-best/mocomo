"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";

const SCALE = 0.85;

export class AptVrmAgent {
  readonly root = new THREE.Group();
  private vrm: VRM | null = null;
  private loaded = false;
  private bobPhase = Math.random() * Math.PI * 2;

  constructor(private url: string) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(this.url);
    const vrm: VRM = gltf.userData.vrm;
    if (!vrm) throw new Error("VRM missing");
    VRMUtils.rotateVRM0(vrm);
    this.vrm = vrm;
    vrm.scene.scale.setScalar(SCALE);
    vrm.scene.traverse((o) => {
      o.frustumCulled = false;
    });
    this.root.add(vrm.scene);
    this.loaded = true;
  }

  update(dt: number, x: number, y: number, z: number, rotY: number, walking: boolean) {
    this.root.position.set(x, y, z);
    this.root.rotation.y = rotY;
    this.bobPhase += dt * (walking ? 6 : 2);
    const bob = walking ? Math.sin(this.bobPhase) * 0.02 : Math.sin(this.bobPhase) * 0.008;
    if (this.vrm?.scene) this.vrm.scene.position.y = bob;
    this.vrm?.update(dt);
  }

  dispose() {
    this.vrm?.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.root.clear();
    this.vrm = null;
    this.loaded = false;
  }
}
