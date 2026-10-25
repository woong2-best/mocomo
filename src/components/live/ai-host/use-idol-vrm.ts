"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import { playableIdolVrmUrl } from "@/lib/ai-live/idols";

export type IdolVrmPhase = "loading" | "ready" | "error";

/** Drop geometries and materials so a swapped model does not stay on the GPU. */
export function disposeIdolVrm(vrm: VRM) {
  const root = vrm.scene;
  root.removeFromParent();
  root.traverse((obj) => {
    const mesh = obj as {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | { dispose: () => void }[];
    };
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose();
  });
}

export async function loadIdolVrm(loader: GLTFLoader, url: string): Promise<VRM> {
  const { VRMUtils } = await import("@pixiv/three-vrm");
  const resolved = playableIdolVrmUrl(url);
  if (!resolved) throw new Error("VRM_URL");
  const gltf = await loader.loadAsync(resolved);
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  const utils = VRMUtils as { combineSkeletons?: (root: unknown) => void };
  utils.combineSkeletons?.(vrm.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
  });
  faceTheCamera(vrm);
  return vrm;
}

/** VRoid exports face -Z. The studio model faces +Z. Turn whichever side the eyes are looking toward the camera. */
function faceTheCamera(vrm: VRM) {
  vrm.scene.rotation.y = 0;
  vrm.scene.updateMatrixWorld(true);
  const humanoid = vrm.humanoid;
  const left = humanoid?.getNormalizedBoneNode("leftEye") ?? humanoid?.getRawBoneNode("leftEye");
  const right = humanoid?.getNormalizedBoneNode("rightEye") ?? humanoid?.getRawBoneNode("rightEye");
  if (!left || !right) return;
  const leftPos = left.getWorldPosition(new THREE.Vector3());
  const rightPos = right.getWorldPosition(new THREE.Vector3());
  const across = new THREE.Vector3().subVectors(leftPos, rightPos);
  across.y = 0;
  if (across.lengthSq() < 1e-8) return;
  across.normalize();
  const forward = new THREE.Vector3().crossVectors(across, new THREE.Vector3(0, 1, 0));
  if (forward.z < 0) vrm.scene.rotation.y = Math.PI;
}

/**
 * Loads `/models/*.vrm` when the tab changes.
 * The scene effect assigns `swapRef` once the loader exists, then calls `arm`.
 */
export function useIdolVrm(url: string) {
  const [phase, setPhase] = useState<IdolVrmPhase>("loading");
  const swapRef = useRef<(url: string) => Promise<boolean>>(async () => false);
  const armed = useRef(false);
  const setPhaseRef = useRef(setPhase);
  setPhaseRef.current = setPhase;

  useEffect(() => {
    if (!armed.current) return;
    let cancelled = false;
    void swapRef
      .current(url)
      .then((ok) => {
        if (!cancelled) setPhase(ok ? "ready" : "error");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { phase, swapRef, armed, setPhaseRef };
}
