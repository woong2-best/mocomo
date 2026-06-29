"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BONDEE_LIGHTING } from "@/lib/apt/style/bondee-lighting-bible";
import { shouldEnableBondeePostFx } from "@/lib/apt/style/bondee-renderer-config";

type ComposerBundle = {
  composer: EffectComposer;
  ssao: SSAOPass;
};

function buildComposer(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  w: number,
  h: number
): ComposerBundle {
  const composer = new EffectComposer(gl);
  composer.addPass(new RenderPass(scene, camera));

  const ssao = new SSAOPass(scene, camera, w, h);
  ssao.kernelRadius = BONDEE_LIGHTING.ssao.kernelRadius;
  ssao.minDistance = BONDEE_LIGHTING.ssao.minDistance;
  ssao.maxDistance = BONDEE_LIGHTING.ssao.maxDistance;
  composer.addPass(ssao);

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    BONDEE_LIGHTING.bloom.strength,
    BONDEE_LIGHTING.bloom.radius,
    BONDEE_LIGHTING.bloom.threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return { composer, ssao };
}

/** SSAO + Bloom — `?bondeeFx=1` 또는 wide viewport에서만 (이중 렌더 주의) */
export function BondeePostFx({ enabled }: { enabled?: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const bundleRef = useRef<ComposerBundle | null>(null);
  const active = enabled ?? shouldEnableBondeePostFx();

  useEffect(() => {
    if (!active) return;
    const bundle = buildComposer(gl, scene, camera, size.width, size.height);
    bundleRef.current = bundle;
    return () => {
      bundle.composer.dispose();
      bundleRef.current = null;
    };
  }, [active, gl, scene, camera, size.width, size.height]);

  useEffect(() => {
    bundleRef.current?.composer.setSize(size.width, size.height);
  }, [size.width, size.height]);

  useFrame(() => {
    if (!active || !bundleRef.current) return;
    bundleRef.current.composer.render();
  }, 1);

  return null;
}
