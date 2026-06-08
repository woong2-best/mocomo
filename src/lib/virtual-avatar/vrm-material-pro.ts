import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { RenderQuality } from "@/lib/virtual-avatar/types";
import { isMToonMaterial } from "@/lib/virtual-avatar/material-utils";
import { applyToonEnhancements } from "@/lib/virtual-avatar/mtoon-pro";

function isSkinMesh(name: string) {  const n = name.toLowerCase();
  return n.includes("face") || n.includes("body") || n.includes("skin");
}

function isEyeMesh(name: string) {
  const n = name.toLowerCase();
  return n.includes("eye") && !n.includes("brow");
}

/** 스튜디오급 PBR·MToon·셀·눈 반사 설정 */
export function enhanceVrmForStudio(
  vrm: VRM,
  envMap: THREE.Texture | null,
  quality: RenderQuality,
  celShading = true
) {
  const envIntensity = quality === "cinematic" ? 1.05 : quality === "studio" ? 0.82 : 0.45;

  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.castShadow = quality !== "performance";
    mesh.receiveShadow = quality !== "performance";

    const name = mesh.name.toLowerCase();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    mats.forEach((raw) => {
      if (isMToonMaterial(raw)) {
        if (envMap && "envMap" in raw) {
          (raw as THREE.MeshStandardMaterial).envMap = envMap;
          (raw as THREE.MeshStandardMaterial).envMapIntensity = envIntensity;
        }
        return;
      }

      if (!(raw instanceof THREE.MeshStandardMaterial)) return;
      const mat = raw;
      if (envMap) {
        mat.envMap = envMap;
        mat.envMapIntensity = envIntensity;
      }

      if (isSkinMesh(name)) {
        mat.roughness = quality === "cinematic" ? 0.38 : 0.48;
        mat.metalness = 0;
      } else if (isEyeMesh(name)) {
        mat.roughness = 0.08;
        mat.metalness = 0.05;
        mat.envMapIntensity = (mat.envMapIntensity ?? 0) + 0.4;
      } else if (name.includes("hair")) {
        mat.roughness = 0.72;
        mat.metalness = 0.02;
      } else {
        mat.roughness = Math.min(mat.roughness, 0.62);
      }

      if (quality === "cinematic" && isSkinMesh(name)) {
        applyRimShader(mat);
      }

      mat.needsUpdate = true;
    });
  });

  if (celShading) applyToonEnhancements(vrm, quality);
}
function applyRimShader(mat: THREE.MeshStandardMaterial) {
  if (mat.userData.rimPatched) return;
  mat.userData.rimPatched = true;

  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
        float rim = 1.0 - max(0.0, dot(normalize(vNormal), normalize(vViewPosition)));
        rim = smoothstep(0.55, 1.0, rim);
        gl_FragColor.rgb += vec3(1.0, 0.92, 0.85) * rim * 0.12;
        #include <dithering_fragment>
      `
    );
  };
}

export function createStudioFloor(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(2.2, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1a22,
    roughness: 0.92,
    metalness: 0.05,
    transparent: true,
    opacity: 0.55,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.52;
  floor.receiveShadow = true;
  floor.name = "studio-floor";
  return floor;
}
