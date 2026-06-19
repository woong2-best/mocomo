"use client";

import * as THREE from "three";

/** Cap DPR for integrated GPUs */
export const SCENE_PIXEL_RATIO_CAP = 1.5;

export const APT_VISIBLE_FLOOR_RADIUS = 2;
export const APT_VISIBLE_FLOOR_COUNT = APT_VISIBLE_FLOOR_RADIUS * 2 + 1;

export function cappedPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, SCENE_PIXEL_RATIO_CAP);
}

export function createAptRenderer(mount: HTMLElement, opts?: { alpha?: boolean }) {
  const renderer = new THREE.WebGLRenderer({
    antialias: window.devicePixelRatio <= 1.25,
    alpha: opts?.alpha ?? false,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setPixelRatio(cappedPixelRatio());
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function enableLightShadows(light: THREE.DirectionalLight, mapSize = 512) {
  light.castShadow = true;
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 24;
  light.shadow.camera.left = -6;
  light.shadow.camera.right = 6;
  light.shadow.camera.top = 6;
  light.shadow.camera.bottom = -6;
}

/** Strip shadow work from procedural meshes — avatar-only shadows elsewhere */
export function stripShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
}

export function enableAvatarShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
}
