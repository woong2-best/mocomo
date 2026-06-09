import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { RenderQuality } from "@/lib/virtual-avatar/types";
import { collectSceneMaterials, isMToonMaterial, type MToonLike } from "@/lib/virtual-avatar/material-utils";

export function enhanceMToonForStudio(vrm: VRM, quality: RenderQuality) {
  const materials = collectSceneMaterials(vrm.scene).filter(isMToonMaterial);

  materials.forEach((mat) => {
    tuneMToonMaterial(mat, quality);
  });

  return materials;
}

function tuneMToonMaterial(mat: MToonLike, quality: RenderQuality) {
  if (quality === "performance") {
    mat.shadingToonyFactor = 0.85;
    mat.outlineWidthFactor = 0.002;
    return;
  }

  if (quality === "cinematic") {
    mat.shadingToonyFactor = 0.92;
    mat.outlineWidthFactor = 0.0045;
    if (mat.shadeColorFactor instanceof THREE.Color) {
      mat.shadeColorFactor.multiplyScalar(0.95);
    }
    return;
  }

  mat.shadingToonyFactor = 0.9;
  mat.outlineWidthFactor = 0.0038;
}

export function convertStandardToToonLook(mat: THREE.MeshStandardMaterial, quality: RenderQuality) {
  if (mat.userData.toonPatched) return;
  mat.userData.toonPatched = true;

  const toony = quality === "cinematic" ? 0.35 : 0.25;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <output_fragment>",
      `
        float NdotL = dot(normalize(vNormal), normalize(vec3(0.4, 1.0, 0.6)));
        float toon = smoothstep(${toony}, ${toony + 0.18}, NdotL * 0.5 + 0.5);
        diffuseColor.rgb *= mix(0.72, 1.0, toon);
        #include <output_fragment>
      `
    );
  };
  mat.needsUpdate = true;
}

export function applyToonEnhancements(vrm: VRM, quality: RenderQuality) {
  const mtoon = enhanceMToonForStudio(vrm, quality);
  if (mtoon.length > 0) return mtoon;

  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      if (m instanceof THREE.MeshStandardMaterial) convertStandardToToonLook(m, quality);
    });
  });

  return collectSceneMaterials(vrm.scene).filter(isMToonMaterial);
}
