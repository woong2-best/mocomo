"use client";

import { useEffect, useRef, useState } from "react";
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
  const gltf = await loader.loadAsync(resolved);
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  const utils = VRMUtils as { combineSkeletons?: (root: unknown) => void };
  utils.combineSkeletons?.(vrm.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((obj) => {
    obj.frustumCulled = false;
  });
  vrm.scene.rotation.y = 0;
  return vrm;
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
    setPhase("loading");
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
